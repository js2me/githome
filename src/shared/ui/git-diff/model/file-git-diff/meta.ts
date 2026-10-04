import { action, computed, observable } from "mobx";
import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import {
  getFileLevelThreadsForChange,
  indexDiffDiscussionsForChange,
} from "@/shared/lib/gitlab/diff-discussions";
import { getDiffFileKey } from "@/shared/lib/diff-search";
import type { FileGitDiff } from ".";
import {
  getChangeBadge,
  getChangePath,
  getExpandFilePath,
} from "./helpers";

export class FileGitDiffMeta {
  @observable accessor change: GitLabMergeRequestChangeDC;

  constructor(
    private readonly file: FileGitDiff,
    change: GitLabMergeRequestChangeDC,
  ) {
    this.change = change;
  }

  @computed
  get isDiffContentHidden() {
    const { content } = this.file;

    return this.isAutoCollapsed && !content.isFileExpanded;
  }

  @computed
  get isCollapsible() {
    return this.isAutoCollapsed || this.isLazyCollapsed;
  }

  @action.bound
  syncChange(change: GitLabMergeRequestChangeDC) {
    const prev = this.change;

    if (
      prev.old_path === change.old_path &&
      prev.new_path === change.new_path &&
      prev.diff?.trim() &&
      !change.diff?.trim()
    ) {
      this.change = { ...change, diff: prev.diff };
      return;
    }

    this.change = change;
  }

  @computed
  get fileKey() {
    return getDiffFileKey(this.change.old_path, this.change.new_path);
  }

  @computed
  get badge() {
    return getChangeBadge(this.change);
  }

  @computed
  get filePath() {
    return getExpandFilePath(this.change);
  }

  @computed
  get fileRef() {
    return this.change.deleted_file
      ? (this.file.parent.payload.baseRef ?? null)
      : (this.file.parent.payload.headRef ?? null);
  }

  @computed
  get canExpand() {
    return Boolean(
      this.file.parent.payload.loadFileContent && this.fileRef && this.filePath,
    );
  }

  @computed
  get isAutoCollapsed() {
    const change = this.change;

    return !change.too_large && Boolean(change.generated_file);
  }

  @computed
  get searchFilePath() {
    return getChangePath(this.change);
  }

  @computed
  get isActive() {
    return this.file.parent.payload.activeFileKey === this.fileKey;
  }

  @computed
  get discussions() {
    return this.file.parent.payload.discussions;
  }

  @computed
  get threadIndex() {
    return indexDiffDiscussionsForChange(this.discussions, this.change);
  }

  @computed
  get fileThreads() {
    return getFileLevelThreadsForChange(this.discussions, this.change);
  }

  @computed
  get isLazyCollapsed() {
    const change = this.change;

    return (
      !change.too_large &&
      !change.generated_file &&
      !change.diff?.trim() &&
      this.canExpand
    );
  }

  @computed
  private get showCollapsedStats() {
    const { content } = this.file;
    const hasApiStats =
      this.change.added_lines != null || this.change.removed_lines != null;

    if (!hasApiStats) {
      return false;
    }

    if (this.isDiffContentHidden) {
      return true;
    }

    return this.isLazyCollapsed && !content.parsed;
  }

  @computed
  get additions() {
    const { content } = this.file;

    return this.showCollapsedStats
      ? (this.change.added_lines ?? 0)
      : (content.parsed?.additions ?? 0);
  }

  @computed
  get deletions() {
    const { content } = this.file;

    return this.showCollapsedStats
      ? (this.change.removed_lines ?? 0)
      : (content.parsed?.deletions ?? 0);
  }

  @computed
  get reservedBodyLineCount() {
    const change = this.change;
    const { content } = this.file;

    if (this.isDiffContentHidden) {
      return 0;
    }

    if (change.too_large && !content.parsed) {
      return 0;
    }

    if (change.diff?.trim()) {
      let count = 0;
      for (const line of change.diff.split("\n")) {
        if (
          line.startsWith("---") ||
          line.startsWith("+++") ||
          line.startsWith("diff --git")
        ) {
          continue;
        }

        count += 1;
      }

      return count;
    }

    const lineStats = (change.added_lines ?? 0) + (change.removed_lines ?? 0);
    if (lineStats > 0) {
      return (
        Math.ceil(lineStats * 1.6) + Math.max(1, Math.ceil(lineStats / 15))
      );
    }

    return 0;
  }

  @computed
  get reservedBodyMinHeight(): string | undefined {
    const { content } = this.file;

    if (content.parsed) {
      return undefined;
    }

    if (this.isDiffContentHidden) {
      return "6.5rem";
    }

    const change = this.change;
    if (change.too_large && !content.parsed) {
      return "5rem";
    }

    const lines = this.reservedBodyLineCount;
    if (lines === 0) {
      return undefined;
    }

    return `calc(${lines} * var(--diff-code-font-size) * var(--diff-code-line-height) + 2rem)`;
  }
}
