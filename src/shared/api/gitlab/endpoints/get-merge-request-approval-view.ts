import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { buildMergeRequestApprovalView } from "@/shared/lib/gitlab/merge-request-approval-view";
import type { GitLabMergeRequestReviewerDC, GitLabProjectDC } from "../data-contracts";
import { getCurrentUserId } from "./get-current-user";
import { getMergeRequestApprovals } from "./get-merge-request-approvals";
import { getMergeRequestReviewers } from "./get-merge-request-reviewers";

export const getMergeRequestApprovalView = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
) => {
  const [currentUserId, approvalsResult, reviewers] = await Promise.all([
    getCurrentUserId(connection, signal).catch(() => null),
    getMergeRequestApprovals(connection, project, mergeRequestIid, signal).catch(
      () => null,
    ),
    getMergeRequestReviewers(connection, project, mergeRequestIid, signal).catch(
      () => [] as GitLabMergeRequestReviewerDC[],
    ),
  ]);

  return buildMergeRequestApprovalView(
    currentUserId,
    approvalsResult,
    reviewers,
  );
};
