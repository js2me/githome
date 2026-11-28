import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import {
  type GitLabMergeRequestReviewerDC,
  type GitLabProjectDC,
  gitlabApi,
} from '../..';
import { getMergeRequestReviewers } from '../../endpoints/merge-requests/reviewers/get-merge-request-reviewers';
import {
  createGitlabApiQuery,
  type GitlabQueryContext,
} from '../core/create-query';
import { gitlabConnectionKey } from '../core/keys';

export interface ProjectGroup {
  id: number;
  path_with_namespace?: string;
  iids: number[];
}

export type ReviewState = 'requested' | 'waiting';

function getInboxReviewState(
  reviewers: GitLabMergeRequestReviewerDC[],
): ReviewState | undefined {
  if (reviewers.some(({ state }) => state === 'requested_changes'))
    return 'requested';
  if (
    reviewers.some(
      ({ state }) => state === 'unreviewed' || state === 'review_requested',
    )
  )
    return 'waiting';
}

async function loadReviewStates(
  connection: GitLabConnection,
  project: ProjectGroup,
  iids: number[],
  signal: AbortSignal,
) {
  const byIid: Partial<Record<number, ReviewState>> = {};
  await Promise.all(
    iids.map(async (iid) => {
      try {
        const reviewers = await getMergeRequestReviewers(
          connection,
          project,
          iid,
          signal,
        );
        const state = getInboxReviewState(reviewers);
        if (state) byIid[iid] = state;
      } catch {
        signal.throwIfAborted();
      }
    }),
  );
  return byIid;
}

const createInboxSummaryQuery =
  <T>(
    kind: string,
    fetchGroup: (
      connection: GitLabConnection,
      project: ProjectGroup,
      iids: number[],
      signal: AbortSignal,
    ) => Promise<Partial<Record<number, T>>>,
  ) =>
  (
    globals: GitlabQueryContext,
    abortSignal: AbortSignal,
    getGroups: () => ProjectGroup[],
  ) => {
    return createGitlabApiQuery({
      globals,
      abortSignal,
      params: () => {
        const groups = getGroups();
        return groups.length ? { groups } : null;
      },
      queryKey: ({ connection, groups }) => [
        'inbox-statuses',
        kind,
        ...gitlabConnectionKey(connection),
        groups,
      ],
      queryFn: async ({ connection, groups, signal }) => {
        const results: Partial<Record<number, Partial<Record<number, T>>>> = {};
        await Promise.all(
          groups.map(async (project) => {
            try {
              results[project.id] = await fetchGroup(
                connection,
                project,
                project.iids,
                signal,
              );
            } catch {
              signal.throwIfAborted();
            }
          }),
        );
        return results;
      },
      queryOptions: { retry: false, staleTime: 30_000 },
    });
  };

export const createInboxApprovalSummariesQuery = createInboxSummaryQuery(
  'approvals',
  gitlabApi.getMergeRequestApprovalSummaries,
);
export const createInboxDiscussionSummariesQuery = createInboxSummaryQuery(
  'discussions',
  gitlabApi.getMergeRequestDiscussionSummaries,
);
export const createInboxReviewStatesQuery = createInboxSummaryQuery(
  'reviewers',
  loadReviewStates,
);

const createMrListSummaryQuery =
  <T>(
    kind: 'approvals' | 'discussions',
    fetchSummaries: (
      connection: GitLabConnection,
      project: GitLabProjectDC,
      iids: number[],
      signal: AbortSignal,
    ) => Promise<Partial<Record<number, T>>>,
  ) =>
  (
    globals: GitlabQueryContext,
    abortSignal: AbortSignal,
    params: () => { project: GitLabProjectDC; iids: number[] } | null,
  ) => {
    return createGitlabApiQuery({
      globals,
      abortSignal,
      params,
      queryKey: ({ connection, project, iids }) => [
        'merge-request-list',
        kind,
        ...gitlabConnectionKey(connection),
        project.id,
        iids,
      ],
      queryFn: ({ connection, project, iids, signal }) =>
        fetchSummaries(connection, project, iids, signal),
      queryOptions: { retry: false },
    });
  };

export const createMrListApprovalSummariesQuery = createMrListSummaryQuery(
  'approvals',
  gitlabApi.getMergeRequestApprovalSummaries,
);
export const createMrListDiscussionSummariesQuery = createMrListSummaryQuery(
  'discussions',
  gitlabApi.getMergeRequestDiscussionSummaries,
);
