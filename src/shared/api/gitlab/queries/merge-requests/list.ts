import type { GitLabMergeRequestDC } from '@/shared/api/gitlab/data-contracts';
import {
  defineGitlabQuery,
  defineInfiniteGitlabQuery,
} from '@/shared/api/gitlab/queries/core/define-query';

type SearchRequest = GitLabMergeRequestDC & { references?: { full?: string } };

export const createMergeRequestPaletteQuery = defineGitlabQuery<
  SearchRequest[],
  { term: string; iid?: string }
>(({ term, iid }) => ({
  path: '/merge_requests',
  query: {
    scope: 'all',
    state: 'all',
    per_page: 8,
    order_by: 'updated_at',
    ...(iid ? { 'iids[]': iid } : { search: term, in: 'title' }),
  },
}));

export const createProjectMergeRequestListQuery = defineInfiniteGitlabQuery<
  GitLabMergeRequestDC,
  {
    projectId: number;
    search: string;
    filter: 'opened' | 'mine' | 'closed' | 'merged';
  }
>(({ projectId, search, filter }) => {
  const iid = search.match(/^!?(\d+)$/)?.[1];
  const title = iid ? undefined : search || undefined;

  return {
    path: `/projects/${projectId}/merge_requests`,
    query: {
      ...(filter === 'mine' ? { scope: 'created_by_me' } : { state: filter }),
      'iids[]': iid,
      search: title,
      in: title ? 'title' : undefined,
      order_by: 'updated_at',
      sort: 'desc',
      per_page: 20,
    },
  };
});
