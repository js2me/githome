import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabMergeRequestDC, GitLabProjectDC } from "../data-contracts";

export const getProjectMergeRequests = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  options?: { limit?: number; signal?: AbortSignal },
): Promise<GitLabMergeRequestDC[]> => {
  const limit = options?.limit ?? 20;
  const params = new URLSearchParams({
    state: "opened",
    order_by: "updated_at",
    sort: "desc",
    per_page: String(limit),
  });

  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests?${params.toString()}`,
    options?.signal,
  );

  return (await response.json()) as GitLabMergeRequestDC[];
};
