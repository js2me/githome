import { action, computed, observable } from "mobx";
import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import {
  getFileLevelThreadsForChange,
  indexDiffDiscussionsForChange,
} from "@/shared/lib/gitlab/diff-discussions";
import { isAutoCollapsedMergeRequestChange } from "@/shared/lib/gitlab/merge-request-changes-visibility";
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

  @action.bound
  syncChange(change: GitLabMergeRequestChangeDC) {
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
    return isAutoCollapsedMergeRequestChange(this.change);
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
  get additions() {
    const { content } = this.file;
    const showCollapsedStats =
      this.isAutoCollapsed &&
      !content.isFileExpanded &&
      (this.change.added_lines != null || this.change.removed_lines != null);

    return showCollapsedStats
      ? (this.change.added_lines ?? 0)
      : (content.parsed?.additions ?? 0);
  }

  @computed
  get deletions() {
    const { content } = this.file;
    const showCollapsedStats =
      this.isAutoCollapsed &&
      !content.isFileExpanded &&
      (this.change.added_lines != null || this.change.removed_lines != null);

    return showCollapsedStats
      ? (this.change.removed_lines ?? 0)
      : (content.parsed?.deletions ?? 0);
  }
}
