import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type {
  GitLabMergeRequestApprovalsDC,
  GitLabProjectDC,
} from "../data-contracts";

export const getMergeRequestApprovals = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestApprovalsDC> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/approvals`,
    signal,
  );

  return (await response.json()) as GitLabMergeRequestApprovalsDC;
};
