import type { GitLabMergeRequestDC } from '../../../data-contracts';
import { defineInfiniteGitlabQuery } from '../../core/define-query';

export type InboxScope = 'reviewer' | 'author';

export type InboxRequest = GitLabMergeRequestDC & {
  project_id: number;
  references?: { full?: string };
};

export const createInboxRequestsQuery = defineInfiniteGitlabQuery<
  InboxRequest,
  {
    scope: InboxScope;
    term: string;
    reviewerId?: number;
  }
>(({ scope, term, reviewerId }) => {
  if (scope === 'reviewer' && !reviewerId) return null;
  const iid = /^!?([1-9]\d*)$/.exec(term)?.[1];
  return {
    path: '/merge_requests',
    query: {
      state: 'opened',
      order_by: 'updated_at',
      sort: 'desc',
      per_page: term ? 20 : 10,
      ...(scope === 'reviewer'
        ? { scope: 'all', reviewer_id: reviewerId }
        : { scope: 'created_by_me' }),
      ...(iid ? { 'iids[]': iid } : term ? { search: term, in: 'title' } : {}),
    },
  };
});
