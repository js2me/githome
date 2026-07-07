import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { buildGitlabPath, gitlabFetch } from "../client";
import type { GitLabSearchBlobDC } from "../data-contracts";

export const searchProjectBlobs = async (
  connection: GitLabConnection,
  projectId: number,
  search: string,
  ref: string,
  signal?: AbortSignal,
): Promise<GitLabSearchBlobDC[]> => {
  const path = buildGitlabPath(`/projects/${projectId}/search`, {
    scope: "blobs",
    search,
    ref,
    per_page: "30",
  });

  const response = await gitlabFetch(connection, path, signal);

  return (await response.json()) as GitLabSearchBlobDC[];
};
