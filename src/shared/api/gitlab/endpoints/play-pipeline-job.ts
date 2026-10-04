import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPost } from "../client";
import type { GitLabJobDC } from "../data-contracts";

export const playPipelineJob = (
  connection: GitLabConnection,
  projectId: number,
  jobId: number,
  signal?: AbortSignal,
): Promise<GitLabJobDC> =>
  gitlabPost(
    connection,
    `/projects/${projectId}/jobs/${jobId}/play`,
    {},
    signal,
  );
