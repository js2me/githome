import type {
  GitLabDiscussionDC,
  GitLabMergeRequestApprovalsDC,
  GitLabMergeRequestDC,
  GitLabMergeRequestReviewerDC,
} from '@/shared/api/gitlab/data-contracts';
import { gitlabApi } from '@/shared/api/gitlab/index';
import {
  defineGitlabApiQuery,
  defineGitlabQuery,
  defineInfiniteGitlabQuery,
} from '@/shared/api/gitlab/queries/core/define-query';
import { mergeRequestDetailKey } from '@/shared/api/gitlab/queries/merge-requests/detail-key';
import { extractJiraLinks } from '@/shared/lib/gitlab/markdown/jira-links';
import { gitlabConnectionKey } from '../core/keys';

export const createMergeRequestDetailQuery = defineGitlabApiQuery<
  GitLabMergeRequestDC,
  { projectId: number; mergeRequestIid: number }
>({
  queryKey: ({ connection, projectId, mergeRequestIid }) =>
    mergeRequestDetailKey(connection, projectId, mergeRequestIid),
  queryFn: ({ connection, projectId, mergeRequestIid, signal }) =>
    gitlabApi.getMergeRequestDetail(
      connection,
      projectId,
      mergeRequestIid,
      signal,
    ),
});

export const createMergeRequestJiraLinksQuery = defineGitlabApiQuery<
  Record<string, string>,
  { projectPath: string; keys: string[] }
>({
  queryKey: ({ connection, projectPath, keys }) => [
    'mr-jira-links',
    ...gitlabConnectionKey(connection),
    projectPath,
    keys,
  ],
  queryFn: async ({ connection, projectPath, keys, signal }) => {
    const html = await gitlabApi.renderMarkdown(connection, {
      text: keys.join('\n\n'),
      projectPath,
      signal,
    });
    return extractJiraLinks(html, keys);
  },
  queryOptions: { staleTime: 300_000, retry: false },
});

export const createMergeRequestReviewersQuery = defineGitlabQuery<
  GitLabMergeRequestReviewerDC[],
  { projectId: number; mergeRequestIid: number }
>(({ projectId, mergeRequestIid }) => ({
  path: `/projects/${projectId}/merge_requests/${mergeRequestIid}/reviewers`,
}));

export const createMergeRequestApprovalsQuery = defineGitlabQuery<
  GitLabMergeRequestApprovalsDC,
  { projectId: number; mergeRequestIid: number }
>(({ projectId, mergeRequestIid }) => ({
  path: `/projects/${projectId}/merge_requests/${mergeRequestIid}/approvals`,
}));

export const createMergeRequestDiscussionsQuery = defineInfiniteGitlabQuery<
  GitLabDiscussionDC,
  { projectId: number; mergeRequestIid: number }
>(({ projectId, mergeRequestIid }) => ({
  path: `/projects/${projectId}/merge_requests/${mergeRequestIid}/discussions`,
  query: { per_page: 100, sort: 'asc' },
}));
