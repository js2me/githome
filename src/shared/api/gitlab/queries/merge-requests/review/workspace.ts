import { skipToken } from '@tanstack/query-core';
import { createQuery, queryClient } from 'mobx-tanstack-query/preset';
import {
  type GitLabMergeRequestApprovalSummary,
  type GitLabMergeRequestDiscussionSummary,
  gitlabApi,
} from '@/shared/api/gitlab';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabConnectionKey } from '../../core/keys';

export interface WorkspaceReviewGroup {
  connection: GitLabConnection;
  project: { id: number; path_with_namespace?: string };
  tabs: { iid: number; id: string }[];
}

export interface WorkspaceReview {
  approval?: GitLabMergeRequestApprovalSummary;
  discussions?: GitLabMergeRequestDiscussionSummary;
}

async function fetchReviews(
  groups: WorkspaceReviewGroup[],
  signal: AbortSignal,
) {
  const result: Record<string, WorkspaceReview> = {};
  await Promise.all(
    groups.map(async ({ connection, project, tabs }) => {
      const iids = tabs.map(({ iid }) => iid);
      const [approvals, discussions] = await Promise.allSettled([
        gitlabApi.getMergeRequestApprovalSummaries(
          connection,
          project,
          iids,
          signal,
        ),
        gitlabApi.getMergeRequestDiscussionSummaries(
          connection,
          project,
          iids,
          signal,
        ),
      ]);
      signal.throwIfAborted();
      for (const { id, iid } of tabs) {
        result[id] = {
          approval:
            approvals.status === 'fulfilled' ? approvals.value[iid] : undefined,
          discussions:
            discussions.status === 'fulfilled'
              ? discussions.value[iid]
              : undefined,
        };
      }
    }),
  );
  return result;
}

export function createGitlabWorkspaceReviewQuery(
  abortSignal: AbortSignal,
  getGroups: () => WorkspaceReviewGroup[],
) {
  return createQuery(queryClient, () => {
    const groups = getGroups();
    return {
      abortSignal,
      enabled: groups.length > 0,
      queryKey: [
        'workspace-review',
        groups.map(({ connection, project, tabs }) => [
          ...gitlabConnectionKey(connection),
          project,
          tabs,
        ]),
      ],
      queryFn: groups.length
        ? ({ signal }: { signal: AbortSignal }) => fetchReviews(groups, signal)
        : skipToken,
      retry: false,
      refetchInterval: 60_000,
    };
  });
}
