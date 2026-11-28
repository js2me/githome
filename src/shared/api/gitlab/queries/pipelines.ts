import { fetchGitlabJson } from '@/shared/api/gitlab/client';
import type {
  GitLabJobDC,
  GitLabMergeRequestDC,
  GitLabPipelineDC,
  GitLabPipelineSummaryDC,
} from '@/shared/api/gitlab/data-contracts';
import { gitlabApi } from '@/shared/api/gitlab/index';
import {
  defineGitlabApiQuery,
  defineGitlabQuery,
  defineInfiniteGitlabQuery,
} from '@/shared/api/gitlab/queries/core/define-query';
import { gitlabConnectionKey } from './core/keys';

export const createPipelineJobsQuery = defineGitlabApiQuery<
  GitLabJobDC[],
  { projectId: number; pipelineId: number }
>({
  queryKey: ({ connection, projectId, pipelineId }) => [
    'pipeline-jobs',
    ...gitlabConnectionKey(connection),
    projectId,
    pipelineId,
  ],
  queryFn: ({ connection, projectId, pipelineId, signal }) =>
    gitlabApi.getPipelineJobs(connection, projectId, pipelineId, signal),
});

export const createPipelineJobTraceQuery = defineGitlabApiQuery<
  string,
  { projectId: number; jobId: number }
>({
  queryKey: ({ connection, projectId, jobId }) => [
    'pipeline-job-trace',
    ...gitlabConnectionKey(connection),
    projectId,
    jobId,
  ],
  queryFn: ({ connection, projectId, jobId, signal }) =>
    gitlabApi.getPipelineJobTrace(connection, projectId, jobId, signal),
});

export const createPipelineStageOrderQuery = defineGitlabApiQuery<
  string[],
  { projectPath: string; pipelineId: number }
>({
  queryKey: ({ connection, projectPath, pipelineId }) => [
    'pipeline-stage-order',
    ...gitlabConnectionKey(connection),
    projectPath,
    pipelineId,
  ],
  queryFn: ({ connection, projectPath, pipelineId, signal }) =>
    gitlabApi.getPipelineStages(connection, projectPath, pipelineId, signal),
  queryOptions: { staleTime: 300_000, retry: false },
});

export const createPipelineMergeRequestDetailsQuery = defineGitlabApiQuery<
  Record<number, GitLabMergeRequestDC | null>,
  { projectId: number; iids: number[] }
>({
  queryKey: ({ connection, projectId, iids }) =>
    [
      'pipeline-merge-request-details',
      ...gitlabConnectionKey(connection),
      projectId,
      iids,
    ] as const,
  queryFn: async ({ connection, projectId, iids, signal }) => {
    const results = await Promise.all(
      iids.map(async (iid) => {
        try {
          const mergeRequest = await fetchGitlabJson<GitLabMergeRequestDC>(
            connection,
            `/projects/${projectId}/merge_requests/${iid}`,
            { signal },
          );
          return [iid, mergeRequest] as const;
        } catch {
          return [iid, null] as const;
        }
      }),
    );

    return Object.fromEntries(results);
  },
});

export const createPipelineQuery = defineGitlabQuery<
  GitLabPipelineDC,
  { projectId: number; pipelineId: number }
>(({ projectId, pipelineId }) => ({
  path: `/projects/${projectId}/pipelines/${pipelineId}`,
}));

export const createProjectPipelinesQuery = defineInfiniteGitlabQuery<
  GitLabPipelineDC,
  { projectId: number; status?: string; ref?: string }
>(({ projectId, status, ref }) => ({
  path: `/projects/${projectId}/pipelines`,
  query: { order_by: 'id', sort: 'desc', per_page: 20, status, ref },
}));

export const createBranchPipelinesQuery = defineGitlabQuery<
  GitLabPipelineSummaryDC[],
  { projectId: number; ref: string; sha: string }
>(({ projectId, ref, sha }) => ({
  path: `/projects/${projectId}/pipelines`,
  query: { scope: 'branches', ref, sha, order_by: 'id', sort: 'desc' },
}));

export const createMergeRequestPipelinesQuery = defineInfiniteGitlabQuery<
  GitLabPipelineSummaryDC,
  { projectId: number; iid: number }
>(({ projectId, iid }) => ({
  path: `/projects/${projectId}/merge_requests/${iid}/pipelines`,
  query: { per_page: 30 },
}));
