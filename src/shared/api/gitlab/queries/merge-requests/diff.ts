import type {
  GitLabCommitDC,
  GitLabMergeRequestChangeDC,
  GitLabMergeRequestDC,
  GitLabMergeRequestVersionDC,
  GitLabProjectDC,
} from '@/shared/api/gitlab/data-contracts';
import { gitlabApi } from '@/shared/api/gitlab/index';
import {
  defineGitlabApiQuery,
  defineInfiniteGitlabQuery,
} from '@/shared/api/gitlab/queries/core/define-query';

export const createMergeRequestVersionsQuery = defineGitlabApiQuery<
  GitLabMergeRequestVersionDC[],
  { project: GitLabProjectDC; mergeRequestIid: number } & {
    revision: string;
    scope: string;
  }
>({
  queryKey: ({ scope, revision }) => [
    'merge-request-versions',
    scope,
    revision,
  ],
  queryFn: ({ connection, project, mergeRequestIid, signal }) =>
    gitlabApi.getMergeRequestVersions(
      connection,
      project,
      mergeRequestIid,
      signal,
    ),
});

export const createMergeRequestChangesQuery = defineGitlabApiQuery<
  GitLabMergeRequestChangeDC[],
  { project: GitLabProjectDC; mergeRequestIid: number } & {
    revision: string;
    version: GitLabMergeRequestVersionDC | null;
    detail: GitLabMergeRequestDC | null;
  }
>({
  queryOptions: { retry: 1 },
  queryKey: ({ revision }) => ['merge-request-changes', revision],
  queryFn: ({
    connection,
    project,
    mergeRequestIid,
    version,
    detail,
    signal,
  }) =>
    gitlabApi.getMergeRequestChanges(
      connection,
      project,
      mergeRequestIid,
      version?.id ?? null,
      version,
      signal,
      detail ?? undefined,
    ),
});

export const createMergeRequestCommitsQuery = defineInfiniteGitlabQuery<
  GitLabCommitDC,
  { projectId: number; iid: number }
>(({ projectId, iid }) => ({
  path: `/projects/${projectId}/merge_requests/${iid}/commits`,
  query: { per_page: 50 },
}));
