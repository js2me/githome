import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";

export const getPipelineJobTrace = async (
  connection: GitLabConnection,
  projectId: number,
  jobId: number,
  signal?: AbortSignal,
): Promise<string> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${projectId}/jobs/${jobId}/trace`,
    signal,
  );

  return response.text();
};
