import { actionBound, computed, observable, reaction, runInAction } from 'mobx';
import {
  buildDeletedFileUnifiedDiff,
  buildModifiedFileUnifiedDiff,
  buildNewFileUnifiedDiff,
} from '@/shared/lib/diff/build-synthetic-diff';
import { parseUnifiedDiff } from '@/shared/lib/diff/parse-unified-diff';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import type { FileGitDiff } from '..';
import { DisposableModel } from '../disposable';

const shouldStartExpanded = (file: FileGitDiff) => !file.meta.isAutoCollapsed;

export class FileGitDiffContent extends DisposableModel {
  @observable accessor isFileExpanded = false;
  @observable accessor isReviewed = false;
  @observable accessor isContentCollapsed = false;
  @observable accessor expandedDiff: string | null = null;
  @observable private accessor collapsedExpandErrorValue: Error | null = null;

  get collapsedExpandError() {
    return this.collapsedExpandErrorValue?.message ?? null;
  }
  @observable accessor isLoadingCollapsedExpand = false;
  @observable accessor resolvedDiff: string | null = null;
  @observable accessor isResolvingDiff = false;

  constructor(private readonly file: FileGitDiff) {
    super();
    this.isFileExpanded = shouldStartExpanded(this.file);
    if (!this.file.meta.isImage) this.setupReactions();
  }

  @actionBound
  setReviewed(reviewed: boolean, source: boolean | 'auto' = false) {
    if (this.isReviewed === reviewed) return;
    if (reviewed && source) {
      this.file.parent.placeReviewedStack(this.file.fileKey, source === 'auto');
    }
    this.isReviewed = reviewed;
    this.isContentCollapsed = reviewed;
  }

  @computed
  get effectiveDiff() {
    const { meta } = this.file;

    if (meta.isImage || meta.isDiffContentHidden) {
      return '';
    }

    return meta.change.diff || this.expandedDiff || this.resolvedDiff || '';
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

  @actionBound
  async copyFileContent() {
    const { meta, parent } = this.file;
    const loadFileContent = parent.payload.loadFileContent;

    if (!loadFileContent || !meta.fileRef) {
      return this.effectiveDiff;
    }

    return loadFileContent(meta.filePath, meta.fileRef);
  }

  @actionBound
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

    if (this.isLoadingCollapsedExpand) {
      return;
    }

    this.isLoadingCollapsedExpand = true;
    this.collapsedExpandErrorValue = null;

    try {
      if (change.new_file && headRef) {
        const content = await loadFileContent(change.new_path, headRef);
        this.expandedDiff = buildNewFileUnifiedDiff(change.new_path, content);
      } else if (change.deleted_file && baseRef) {
        const content = await loadFileContent(change.old_path, baseRef);
        this.expandedDiff = buildDeletedFileUnifiedDiff(
          change.old_path,
          content,
        );
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
    } catch (error) {
      runInAction(() => {
        this.collapsedExpandErrorValue =
          error instanceof Error
            ? error
            : new LocalizedError('diff.couldNotLoadDiff2');
      });
    } finally {
      this.isLoadingCollapsedExpand = false;
    }
  }

  @actionBound
  toggleFileExpanded() {
    if (this.isFileExpanded) {
      this.isContentCollapsed = !this.isContentCollapsed;
      return;
    }

    this.isContentCollapsed = false;
    void this.expandCollapsedFile();
  }

  @actionBound
  resetOnPathChange() {
    this.isFileExpanded = shouldStartExpanded(this.file);
    this.isContentCollapsed = this.isReviewed;
    this.expandedDiff = null;
    this.collapsedExpandErrorValue = null;
    this.resolvedDiff = null;
    this.isLoadingCollapsedExpand = false;
    this.isResolvingDiff = false;
  }

  private setupReactions() {
    this.disposers.push(
      reaction(
        () => ({
          isLazyCollapsed: this.file.meta.isLazyCollapsed,
          parsed: this.parsed,
          isLoadingCollapsedExpand: this.isLoadingCollapsedExpand,
          isResolvingDiff: this.isResolvingDiff,
          collapsedExpandError: this.collapsedExpandError,
        }),
        (state) => {
          if (
            !state.isLazyCollapsed ||
            state.parsed ||
            state.isLoadingCollapsedExpand ||
            state.isResolvingDiff ||
            state.collapsedExpandError
          ) {
            return;
          }

          this.file.parent.scheduleCollapsedExpand(this);
        },
        { fireImmediately: true },
      ),
    );

    this.disposers.push(
      reaction(
        () =>
          [
            this.file.meta.change.new_path,
            this.file.meta.change.old_path,
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
          isDiffContentHidden: this.file.meta.isDiffContentHidden,
        }),
        (source) => {
          this.resolvedDiff = null;
          this.isResolvingDiff = false;

          if (
            source.diff?.trim() ||
            !source.loadFileContent ||
            source.isDiffContentHidden ||
            this.file.meta.isLazyCollapsed
          ) {
            return;
          }

          const ref = source.deletedFile ? source.baseRef : source.headRef;
          const path = source.deletedFile ? source.oldPath : source.newPath;

          if (!ref || !path || (!source.newFile && !source.deletedFile)) {
            return;
          }

          let cancelled = false;
          this.isResolvingDiff = true;

          void source.loadFileContent!(path, ref)
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
  }
}
