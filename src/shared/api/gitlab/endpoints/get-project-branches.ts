import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabBranchDC } from "../data-contracts";

export const getProjectBranches = async (
  connection: GitLabConnection,
  projectId: number,
  signal?: AbortSignal,
): Promise<GitLabBranchDC[]> => {
  const params = new URLSearchParams({
    per_page: "100",
  });

  const response = await gitlabFetch(
    connection,
    `/projects/${projectId}/repository/branches?${params}`,
    signal,
  );

  return (await response.json()) as GitLabBranchDC[];
};
