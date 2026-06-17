import type {
  GitLabMergeRequestApprovalsDC,
  GitLabMergeRequestReviewerDC,
  GitLabUserDC,
} from "@/shared/api/gitlab";

export interface MergeRequestApprovalView {
  approvals_required: number | null;
  approvals_left: number | null;
  approved: boolean;
  approved_by: Array<{
    user: GitLabUserDC;
    approved_at: string;
  }>;
  reviewers: GitLabMergeRequestReviewerDC[];
  current_user_id: number | null;
  current_user_approved: boolean;
  current_user_requested_changes: boolean;
  approvals_available: boolean;
}

export const buildMergeRequestApprovalView = (
  currentUserId: number | null,
  approvalsResult: GitLabMergeRequestApprovalsDC | null,
  reviewers: GitLabMergeRequestReviewerDC[],
): MergeRequestApprovalView => {
  const approvedBy = approvalsResult?.approved_by ?? [];
  const currentUserApproved =
    currentUserId !== null &&
    approvedBy.some((entry) => entry.user.id === currentUserId);

  const currentUserReviewer = reviewers.find(
    (reviewer) => reviewer.user.id === currentUserId,
  );
  const currentUserRequestedChanges =
    currentUserReviewer?.state === "requested_changes";

  return {
    approvals_required: approvalsResult?.approvals_required ?? null,
    approvals_left: approvalsResult?.approvals_left ?? null,
    approved: approvalsResult?.approved ?? false,
    approved_by: approvedBy,
    reviewers,
    current_user_id: currentUserId,
    current_user_approved: currentUserApproved,
    current_user_requested_changes: currentUserRequestedChanges,
    approvals_available: approvalsResult !== null,
  };
};
