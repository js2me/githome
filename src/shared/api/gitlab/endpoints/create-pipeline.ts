import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPost } from "../client";
import type {
  GitLabPipelineDC,
  GitLabPipelineVariableDC,
} from "../data-contracts";

export const createPipeline = (
  connection: GitLabConnection,
  projectId: number,
  ref: string,
  variables: GitLabPipelineVariableDC[],
  signal?: AbortSignal,
): Promise<GitLabPipelineDC> =>
  gitlabPost(
    connection,
    `/projects/${projectId}/pipeline`,
    { ref, variables },
    signal,
  );
