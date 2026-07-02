import { GitLabDiscussionDC, GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import { CreateDiffCommentInput } from "@/shared/lib/gitlab/diff-comment";
import { DiffFileContentLoader } from "@/shared/lib/syntax-highlight/types";
import type { GitlabMarkdownScope } from "@/shared/ui/gitlab-markdown/model";
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
  currentUserId?: number | null;
  onUpdateDiscussionNote?: (
    discussionId: string,
    noteId: number,
    body: string,
  ) => Promise<boolean>;
  updatingNoteKey?: string | null;
  updateNoteError?: string | null;
  onClearUpdateNoteError?: () => void;
  activeFileKey?: string | null;
  onActiveFileChange?: (fileKey: string) => void;
  markdownScope?: GitlabMarkdownScope;
}

export class GitDiffVM extends ViewModelBase<GitDiffPayload> {}