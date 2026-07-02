import { action, computed, observable, reaction, runInAction } from "mobx";
import {
  buildDeletedFileUnifiedDiff,
  buildModifiedFileUnifiedDiff,
  buildNewFileUnifiedDiff,
} from "@/shared/lib/build-synthetic-diff";
import { parseUnifiedDiff } from "@/shared/lib/parse-unified-diff";
import { DisposableModel } from "./disposable";
import type { FileGitDiff } from ".";

export class FileGitDiffContent extends DisposableModel {
  @observable accessor isFileExpanded = false;
  @observable accessor expandedDiff: string | null = null;
  @observable accessor isLoadingCollapsedExpand = false;
  @observable accessor resolvedDiff: string | null = null;
  @observable accessor isResolvingDiff = false;

  constructor(private readonly file: FileGitDiff) {
    super();
    this.isFileExpanded = !this.file.meta.isAutoCollapsed;
    this.setupReactions();
  }

  @computed
  get effectiveDiff() {
    const { meta } = this.file;

    if (meta.isAutoCollapsed && !this.isFileExpanded) {
      return "";
    }

    return (
      meta.change.diff || this.expandedDiff || this.resolvedDiff || ""
    );
  }

  @computed
  get parsed() {
    return this.effectiveDiff ? parseUnifiedDiff(this.effectiveDiff) : null;
  }

  @computed
  get showTooLargeBanner() {
    const { change } = this.file.meta;

    return (
      Boolean(change.too_large) &&
      !change.diff?.trim() &&
      !this.expandedDiff &&
      !this.resolvedDiff
    );
  }

  @action.bound
  async copyFileContent() {
    const { meta, parent } = this.file;
    const loadFileContent = parent.payload.loadFileContent;

    if (!loadFileContent || !meta.fileRef) {
      return this.effectiveDiff;
    }

    return loadFileContent(meta.filePath, meta.fileRef);
  }

  @action.bound
  async expandCollapsedFile() {
    const { change } = this.file.meta;
    const { headRef, baseRef, loadFileContent } = this.file.parent.payload;

    if (change.too_large) {
      return;
    }

    if (change.diff?.trim()) {
      this.isFileExpanded = true;
      return;
    }

    if (!loadFileContent) {
      return;
    }

    this.isLoadingCollapsedExpand = true;

    try {
      if (change.new_file && headRef) {
        const content = await loadFileContent(change.new_path, headRef);
        this.expandedDiff = buildNewFileUnifiedDiff(change.new_path, content);
      } else if (change.deleted_file && baseRef) {
        const content = await loadFileContent(change.old_path, baseRef);
        this.expandedDiff = buildDeletedFileUnifiedDiff(change.old_path, content);
      } else if (headRef && baseRef) {
        const [oldContent, newContent] = await Promise.all([
          loadFileContent(change.old_path, baseRef),
          loadFileContent(change.new_path, headRef),
        ]);
        this.expandedDiff = buildModifiedFileUnifiedDiff(
          change.old_path,
          change.new_path,
          oldContent,
          newContent,
        );
      }

      this.isFileExpanded = true;
    } finally {
      this.isLoadingCollapsedExpand = false;
    }
  }

  @action.bound
  collapseFile() {
    this.isFileExpanded = false;
  }

  @action.bound
  toggleFileExpanded() {
    if (this.isFileExpanded) {
      this.collapseFile();
      return;
    }

    void this.expandCollapsedFile();
  }

  @action.bound
  resetOnPathChange() {
    this.isFileExpanded = !this.file.meta.isAutoCollapsed;
    this.expandedDiff = null;
  }

  private setupReactions() {
    this.disposers.push(
      reaction(
        () =>
          [
            this.file.meta.change.new_path,
            this.file.meta.change.old_path,
            this.file.meta.isAutoCollapsed,
          ] as const,
        () => {
          this.resetOnPathChange();
          this.file.expand.resetOnPathChange();
        },
      ),
    );

    this.disposers.push(
      reaction(
        () => ({
          diff: this.file.meta.change.diff,
          deletedFile: this.file.meta.change.deleted_file,
          newFile: this.file.meta.change.new_file,
          newPath: this.file.meta.change.new_path,
          oldPath: this.file.meta.change.old_path,
          headRef: this.file.parent.payload.headRef,
          baseRef: this.file.parent.payload.baseRef,
          loadFileContent: this.file.parent.payload.loadFileContent,
          isAutoCollapsed: this.file.meta.isAutoCollapsed,
        }),
        (source) => {
          this.resolvedDiff = null;
          this.isResolvingDiff = false;

          if (source.diff?.trim() || !source.loadFileContent || source.isAutoCollapsed) {
            return;
          }

          const ref = source.deletedFile ? source.baseRef : source.headRef;
          const path = source.deletedFile ? source.oldPath : source.newPath;

          if (!ref || !path || (!source.newFile && !source.deletedFile)) {
            return;
          }

          let cancelled = false;
          this.isResolvingDiff = true;

          void source
            .loadFileContent!(path, ref)
            .then((content) => {
              if (cancelled) {
                return;
              }

              runInAction(() => {
                this.resolvedDiff = source.deletedFile
                  ? buildDeletedFileUnifiedDiff(path, content)
                  : buildNewFileUnifiedDiff(path, content);
              });
            })
            .catch(() => {
              if (!cancelled) {
                runInAction(() => {
                  this.resolvedDiff = null;
                });
              }
            })
            .finally(() => {
              if (!cancelled) {
                runInAction(() => {
                  this.isResolvingDiff = false;
                });
              }
            });

          return () => {
            cancelled = true;
          };
        },
      ),
    );

    this.disposers.push(
      reaction(
        () => ({
          generatedFile: this.file.meta.change.generated_file,
          tooLarge: this.file.meta.change.too_large,
          diff: this.file.meta.change.diff,
          loadFileContent: this.file.parent.payload.loadFileContent,
          expandedDiff: this.expandedDiff,
          resolvedDiff: this.resolvedDiff,
          newFile: this.file.meta.change.new_file,
          deletedFile: this.file.meta.change.deleted_file,
          newPath: this.file.meta.change.new_path,
          oldPath: this.file.meta.change.old_path,
        }),
        (source) => {
          if (
            source.generatedFile ||
            source.tooLarge ||
            source.diff?.trim() ||
            !source.loadFileContent ||
            source.expandedDiff ||
            source.resolvedDiff ||
            source.newFile ||
            source.deletedFile
          ) {
            return;
          }

          void this.expandCollapsedFile();
        },
      ),
    );
  }
}
