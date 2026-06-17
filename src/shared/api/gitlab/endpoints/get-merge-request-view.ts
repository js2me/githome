import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import type { GitLabProjectDC } from "../data-contracts";
import { getMergeRequestApprovalView } from "./get-merge-request-approval-view";
import { getMergeRequestChanges } from "./get-merge-request-changes";
import { getMergeRequestDetail } from "./get-merge-request-detail";
import { getMergeRequestDiscussions } from "./get-merge-request-discussions";

export const getMergeRequestView = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
) => {
  const [detail, changes, discussions, approvals] = await Promise.all([
    getMergeRequestDetail(connection, project, mergeRequestIid, signal),
    getMergeRequestChanges(connection, project, mergeRequestIid, signal),
    getMergeRequestDiscussions(connection, project, mergeRequestIid, signal),
    getMergeRequestApprovalView(connection, project, mergeRequestIid, signal),
  ]);

  return { detail, changes, discussions, approvals };
};
