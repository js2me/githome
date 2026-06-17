import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabProjectDC } from "../data-contracts";

export const getProject = async (
  connection: GitLabConnection,
  projectId: number,
  signal?: AbortSignal,
): Promise<GitLabProjectDC> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${projectId}`,
    signal,
  );

  return (await response.json()) as GitLabProjectDC;
};
