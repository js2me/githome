import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import type { GitDiffVM } from "../git-diff-vm";
import { FileGitDiffComments } from "./comments";
import { FileGitDiffContent } from "./content";
import { FileGitDiffContextExpand } from "./context-expand";
import { FileGitDiffLineSelection } from "./line-selection";
import { FileGitDiffMeta } from "./meta";
import { FileGitDiffNavigation } from "./navigation";
import { FileGitDiffRows } from "./rows";

export class FileGitDiff {
  readonly meta: FileGitDiffMeta;
  readonly content: FileGitDiffContent;
  readonly expand: FileGitDiffContextExpand;
  readonly rows: FileGitDiffRows;
  readonly selection: FileGitDiffLineSelection;
  readonly comments: FileGitDiffComments;
  readonly navigation: FileGitDiffNavigation;

  constructor(
    readonly parent: GitDiffVM,
    change: GitLabMergeRequestChangeDC,
  ) {
    this.meta = new FileGitDiffMeta(this, change);
    this.content = new FileGitDiffContent(this);
    this.expand = new FileGitDiffContextExpand(this);
    this.rows = new FileGitDiffRows(this);
    this.selection = new FileGitDiffLineSelection(this);
    this.comments = new FileGitDiffComments(this);
    this.navigation = new FileGitDiffNavigation(this);
  }

  get change() {
    return this.meta.change;
  }

  get fileKey() {
    return this.meta.fileKey;
  }

  syncChange(change: GitLabMergeRequestChangeDC) {
    this.meta.syncChange(change);
  }

  dispose() {
    this.content.dispose();
    this.expand.dispose();
    this.selection.dispose();
    this.navigation.dispose();
  }
}

export { getChangeBadge, getChangePath, getExpandFilePath } from "./helpers";
