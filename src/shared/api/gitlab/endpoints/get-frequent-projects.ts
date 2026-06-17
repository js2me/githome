import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabProjectDC } from "../data-contracts";

export const getFrequentProjects = async (
  connection: GitLabConnection,
  limit: number,
  signal?: AbortSignal,
): Promise<GitLabProjectDC[]> => {
  const params = new URLSearchParams({
    membership: "true",
    order_by: "last_activity_at",
    sort: "desc",
    per_page: String(limit),
    simple: "false",
  });

  const response = await gitlabFetch(
    connection,
    `/projects?${params.toString()}`,
    signal,
  );

  return (await response.json()) as GitLabProjectDC[];
};
