import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type {
  GitLabMergeRequestReviewerDC,
  GitLabProjectDC,
} from "../data-contracts";

export const getMergeRequestReviewers = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestReviewerDC[]> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/reviewers`,
    signal,
  );

  return (await response.json()) as GitLabMergeRequestReviewerDC[];
};
