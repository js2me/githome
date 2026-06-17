import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";

export const getRepositoryFileContent = async (
  connection: GitLabConnection,
  projectId: number,
  filePath: string,
  ref: string,
  signal?: AbortSignal,
): Promise<string> => {
  const encodedPath = encodeURIComponent(filePath);
  const response = await gitlabFetch(
    connection,
    `/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${encodeURIComponent(ref)}`,
    signal,
  );

  return response.text();
};
