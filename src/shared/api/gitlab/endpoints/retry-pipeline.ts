import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPost } from "../client";
import type { GitLabPipelineDC } from "../data-contracts";

export const retryPipeline = (
  connection: GitLabConnection,
  projectId: number,
  pipelineId: number,
  signal?: AbortSignal,
): Promise<GitLabPipelineDC> =>
  gitlabPost(
    connection,
    `/projects/${projectId}/pipelines/${pipelineId}/retry`,
    {},
    signal,
  );
