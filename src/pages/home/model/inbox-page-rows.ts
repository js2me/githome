import { computed } from 'mobx';
import {
  type GitLabMergeRequestReviewerDC,
  gitlabApi,
} from '@/shared/api/gitlab';
import { getMergeRequestReviewers } from '@/shared/api/gitlab/endpoints/get-merge-request-reviewers';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/create-query';
import { VM } from '@/shared/lib/view-models/vm';
import type { InboxRow } from './review-inbox';

interface ProjectGroup {
  id: number;
  path_with_namespace?: string;
  iids: number[];
}

type ReviewState = 'requested' | 'waiting';

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

function groupInboxRows(rows: InboxRow[]): ProjectGroup[] {
  const projects = new Map<number, ProjectGroup>();
  for (const row of rows) {
    let group = projects.get(row.project_id);
    if (!group) {
      group = { id: row.project_id, iids: [] };
      projects.set(row.project_id, group);
    }
    if (row.projectPath && !row.projectPath.startsWith('#'))
      group.path_with_namespace = row.projectPath;
    if (!group.iids.includes(row.iid)) group.iids.push(row.iid);
  }
  return [...projects.values()];
}

export class InboxPageRowsVM extends VM<{
  rows: InboxRow[];
  onSelect: (row: InboxRow) => void;
}> {
  @computed
  private get groups() {
    return groupInboxRows(this.payload.rows);
  }

  @computed
  private get reviewerGroups() {
    return groupInboxRows(
      this.payload.rows.filter(
        (row) =>
          row.detailed_merge_status !== 'requested_changes' &&
          row.reviewers?.length !== 0,
      ),
    );
  }

  private readonly approvals = this.query(
    'approvals',
    () => this.groups,
    gitlabApi.getMergeRequestApprovalSummaries,
  );
  private readonly discussions = this.query(
    'discussions',
    () => this.groups,
    gitlabApi.getMergeRequestDiscussionSummaries,
  );
  private readonly reviews = this.query(
    'reviewers',
    () => this.reviewerGroups,
    loadReviewStates,
  );

  private query<T>(
    kind: string,
    getGroups: () => ProjectGroup[],
    fetchGroup: (
      connection: GitLabConnection,
      project: ProjectGroup,
      iids: number[],
      signal: AbortSignal,
    ) => Promise<Partial<Record<number, T>>>,
  ) {
    return createGitlabApiQuery({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const groups = getGroups();
        return groups.length ? { groups } : null;
      },
      queryKey: ({ connection, groups }) => [
        'inbox-statuses',
        kind,
        connection.id,
        connection.credentialsRevision,
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
  }

  statusesFor(row: InboxRow) {
    return {
      approval: this.approvals.data?.[row.project_id]?.[row.iid],
      discussions: this.discussions.data?.[row.project_id]?.[row.iid],
      review:
        row.detailed_merge_status === 'requested_changes'
          ? ('requested' as const)
          : this.reviews.data?.[row.project_id]?.[row.iid],
    };
  }
}
