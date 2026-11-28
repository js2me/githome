import type {
  GitLabProjectDC,
  GitLabProjectReadmeDC,
} from '@/shared/api/gitlab/data-contracts';
import { defineGitlabQuery } from '@/shared/api/gitlab/queries/core/define-query';
import type { FetchQueryParams } from '@/shared/lib/query/create-fetch-query';
import {
  defineGitlabListQuery,
  defineInfiniteGitlabQuery,
} from './core/define-query';

export const createProjectRawReadmeQuery = defineGitlabQuery<
  GitLabProjectReadmeDC | null,
  { projectId: number; ref: string; filePath: string }
>(({ projectId, ref, filePath }) => ({
  path: `/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}/raw`,
  query: { ref },
  responseType: 'text',
  notFoundAsNull: true,
}));

export const createProjectReadmeQuery = defineGitlabQuery<
  GitLabProjectReadmeDC | null,
  { projectId: number; ref: string }
>(({ projectId, ref }) => ({
  path: `/projects/${projectId}/repository/readme`,
  query: { ref },
  notFoundAsNull: true,
}));

export const createProjectQuery = defineGitlabQuery<
  GitLabProjectDC,
  { projectId: number }
>(({ projectId }) => ({ path: `/projects/${projectId}` }));

export const createProjectPaletteQuery = defineGitlabQuery<
  GitLabProjectDC[],
  { term: string }
>(({ term }) => ({
  path: '/projects',
  query: {
    per_page: 8,
    simple: true,
    order_by: 'last_activity_at',
    ...(term
      ? { search: term.split('/').filter(Boolean).at(-1) }
      : { starred: true }),
  },
}));

type BuildProjectListParamsOptions = {
  tab: 'contributed' | 'starred' | 'personal' | 'member' | 'inactive';
  perPage: number;
  userId: number | null | undefined;
};

const buildProjectListParams = ({
  tab,
  perPage,
  userId,
}: BuildProjectListParamsOptions): Pick<
  FetchQueryParams,
  'path' | 'query'
> | null => {
  const query = {
    order_by: 'last_activity_at',
    sort: 'desc',
    per_page: perPage,
    simple: false,
  } as const;

  switch (tab) {
    case 'contributed':
      if (!userId) {
        return null;
      }

      return {
        path: `/users/${userId}/contributed_projects`,
        query,
      };
    case 'starred':
      return {
        path: '/projects',
        query: { ...query, starred: true },
      };
    case 'personal':
      return {
        path: '/projects',
        query: { ...query, owned: true },
      };
    case 'member':
      return {
        path: '/projects',
        query: { ...query, membership: true },
      };
    case 'inactive':
      return {
        path: '/projects',
        query: { ...query, membership: true, active: false },
      };
  }
};

export const createAccountProjectsQuery = defineInfiniteGitlabQuery<
  GitLabProjectDC,
  BuildProjectListParamsOptions
>(buildProjectListParams);

export const createAccountProjectCountQuery = defineGitlabListQuery<
  GitLabProjectDC,
  BuildProjectListParamsOptions
>(buildProjectListParams);
