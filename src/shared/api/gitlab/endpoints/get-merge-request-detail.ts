import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabMergeRequestDC, GitLabProjectDC } from "../data-contracts";

export const getMergeRequestDetail = async (
  connection: GitLabConnection,
  project: GitLabProjectDC | string,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestDC> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${typeof project === "string" ? encodeURIComponent(project) : project.id}/merge_requests/${mergeRequestIid}`,
    signal,
    { cache: "no-store" },
  );

  return (await response.json()) as GitLabMergeRequestDC;
};
