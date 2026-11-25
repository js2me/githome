import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import type { GitLabJobDC } from "../data-contracts";
import { fetchPaginatedItems } from "../fetch-paginated-items";

export const getPipelineJobs = (
  connection: GitLabConnection,
  projectId: number,
  pipelineId: number,
  signal?: AbortSignal,
): Promise<GitLabJobDC[]> =>
  fetchPaginatedItems<GitLabJobDC>(
    connection,
    `/projects/${projectId}/pipelines/${pipelineId}/jobs`,
    { include_retried: false },
    signal,
  );
