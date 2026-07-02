import { GitLabDiscussionDC, GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import { CreateDiffCommentInput } from "@/shared/lib/gitlab/diff-comment";
import { DiffFileContentLoader } from "@/shared/lib/syntax-highlight/types";
import { ViewModelBase } from "mobx-view-model";

export interface GitDiffPayload {
  changes: GitLabMergeRequestChangeDC[];
  discussions: GitLabDiscussionDC[];
  canComment: boolean;
  isSubmittingComment: boolean;
  submitCommentError: string | null;
  onAddComment: (input: CreateDiffCommentInput) => Promise<boolean>;
  onClearSubmitError: () => void;
  headRef?: string | null;
  baseRef?: string | null;
  loadFileContent?: DiffFileContentLoader;
  onResolveThread?: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId?: string | null;
  activeFileKey?: string | null;
  onActiveFileChange?: (fileKey: string) => void;
}

export class GitDiffVM extends ViewModelBase<GitDiffPayload> {}