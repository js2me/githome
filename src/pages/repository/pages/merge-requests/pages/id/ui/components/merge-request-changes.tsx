import type {
  CreateDiffCommentInput,
  GitLabDiscussion,
  GitLabMergeRequestChange,
} from "@/shared/api/gitlab";
import {
  GitDiffView,
  type DiffFileContentLoader,
} from "@/shared/ui/git-diff/git-diff-view";

export const MergeRequestChanges = ({
  changes,
  discussions,
  canComment,
  isSubmittingComment,
  submitCommentError,
  onAddComment,
  onClearSubmitError,
  headRef,
  baseRef,
  loadFileContent,
  onResolveThread,
  resolvingDiscussionId,
}: {
  changes: GitLabMergeRequestChange[];
  discussions: GitLabDiscussion[];
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
}) => {
  return (
    <GitDiffView
      changes={changes}
      discussions={discussions}
      canComment={canComment}
      isSubmittingComment={isSubmittingComment}
      submitCommentError={submitCommentError}
      onAddComment={onAddComment}
      onClearSubmitError={onClearSubmitError}
      headRef={headRef}
      baseRef={baseRef}
      loadFileContent={loadFileContent}
      onResolveThread={onResolveThread}
      resolvingDiscussionId={resolvingDiscussionId}
    />
  );
};
