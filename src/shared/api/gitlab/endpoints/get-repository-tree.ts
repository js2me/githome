import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabRepositoryTreeItemDC } from "../data-contracts";

export const getRepositoryTree = async (
  connection: GitLabConnection,
  projectId: number,
  ref: string,
  path?: string,
  signal?: AbortSignal,
  options?: { recursive?: boolean },
): Promise<GitLabRepositoryTreeItemDC[]> => {
  const query = new URLSearchParams({
    ref,
    per_page: "100",
  });

  if (path) {
    query.set("path", path);
  }

  if (options?.recursive) {
    query.set("recursive", "true");
  }

  const response = await gitlabFetch(
    connection,
    `/projects/${projectId}/repository/tree?${query}`,
    signal,
  );

  return (await response.json()) as GitLabRepositoryTreeItemDC[];
};
