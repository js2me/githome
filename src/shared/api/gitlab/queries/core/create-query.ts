import type { QueryObserverOptions } from '@tanstack/query-core';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import {
  type CreateFetchQueryOptions,
  type FetchQueryDynamicOptions,
  type FetchQueryParams,
  type MaybeFalsy,
  serializeFetchQuery,
} from '@/shared/lib/query/create-fetch-query';
import {
  type CreateInfiniteFetchQueryOptions,
  type FetchPageResult,
  parseFetchPageResult,
} from '@/shared/lib/query/create-infinite-fetch-query';
import {
  createScopedInfiniteQuery,
  createScopedQuery,
} from '@/shared/lib/query/create-scoped-query';
import { buildGitlabPath, GitLabApiError, gitlabFetch } from '../../client';
import { gitlabRestResourceKey } from './keys';

export interface GitlabQueryContext {
  readonly stores: {
    readonly settings: { readonly activeConnection: GitLabConnection | null };
  };
}

type RestParams = Pick<
  FetchQueryParams,
  'path' | 'query' | 'notFoundAsNull' | 'responseType'
>;

type RestOptions = {
  globals: GitlabQueryContext;
  abortSignal: AbortSignal;
  params: () => MaybeFalsy<RestParams>;
};

export type CreateGitlabQueryOptions<TData = unknown> = RestOptions & {
  queryOptions?: CreateFetchQueryOptions<TData>['queryOptions'];
};

const disabledKey = ['gitlab-rest', null] as const;

const scopeFor = ({ globals, params }: RestOptions) => {
  const connection = globals.stores.settings.activeConnection;
  const resource = connection && params();
  return connection && resource ? { connection, ...resource } : null;
};

const requestKey = (
  kind: 'single' | 'infinite' | 'count',
  {
    connection,
    path,
    query,
    notFoundAsNull,
    responseType,
  }: RestParams & { connection: GitLabConnection },
) =>
  [
    ...gitlabRestResourceKey(connection, path),
    kind,
    serializeFetchQuery(query),
    notFoundAsNull ?? false,
    responseType ?? 'json',
  ] as const;

const fetchResource = async (
  {
    connection,
    path,
    query,
    notFoundAsNull,
  }: RestParams & { connection: GitLabConnection },
  signal: AbortSignal,
) => {
  try {
    return await gitlabFetch(connection, buildGitlabPath(path, query), signal);
  } catch (error) {
    if (
      notFoundAsNull &&
      error instanceof GitLabApiError &&
      error.status === 404
    )
      return null;
    throw error;
  }
};

type RestScope = NonNullable<ReturnType<typeof scopeFor>>;

export type CreateGitlabApiQueryOptions<TData, TParams extends object> = {
  globals: GitlabQueryContext;
  abortSignal: AbortSignal;
  params: () => MaybeFalsy<TParams>;
  queryOptions?: FetchQueryDynamicOptions<TData> &
    Pick<QueryObserverOptions<TData>, 'placeholderData'>;
  queryKey: (
    resolved: { connection: GitLabConnection } & TParams,
  ) => readonly unknown[];
  queryFn: (
    resolved: { connection: GitLabConnection; signal: AbortSignal } & TParams,
  ) => Promise<TData>;
};

export const createGitlabApiQuery = <TData, TParams extends object>(
  options: CreateGitlabApiQueryOptions<TData, TParams>,
) => {
  return createScopedQuery({
    abortSignal: options.abortSignal,
    scope: () => {
      const connection = options.globals.stores.settings.activeConnection;
      const params = options.params();
      return connection && params ? { ...params, connection } : null;
    },
    disabledKey: ['gitlab-api', null],
    queryKey: options.queryKey,
    queryFn: (scope, signal) => options.queryFn({ ...scope, signal }),
    queryOptions: options.queryOptions,
  });
};

export const createGitlabQuery = <TData = unknown>(
  options: CreateGitlabQueryOptions<TData>,
) =>
  createScopedQuery<unknown, RestScope, TData>({
    abortSignal: options.abortSignal,
    scope: () => scopeFor(options),
    disabledKey,
    queryKey: (scope) => requestKey('single', scope),
    queryFn: async (scope, signal) => {
      const response = await fetchResource(scope, signal);
      if (!response) return null;
      return scope.responseType === 'text' ? response.text() : response.json();
    },
    queryOptions: options.queryOptions,
  });

export type CreateInfiniteGitlabQueryOptions = RestOptions & {
  initialPageParam?: number;
  queryOptions?: CreateInfiniteFetchQueryOptions['queryOptions'];
};

export const createInfiniteGitlabQuery = <TItem = unknown>(
  options: CreateInfiniteGitlabQueryOptions,
) =>
  createScopedInfiniteQuery<FetchPageResult<TItem>, RestScope, number>({
    abortSignal: options.abortSignal,
    scope: () => scopeFor(options),
    disabledKey,
    queryKey: (scope) => requestKey('infinite', scope),
    initialPageParam: options.initialPageParam ?? 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    queryFn: async (scope, pageParam, signal) => {
      const response = await fetchResource(
        { ...scope, query: { ...scope.query, page: pageParam } },
        signal,
      );
      if (!response)
        return { items: [], total: 0, page: pageParam, hasNextPage: false };
      const perPage = Number(scope.query?.per_page);
      return parseFetchPageResult<TItem>(
        response,
        pageParam,
        perPage > 0 ? perPage : undefined,
      );
    },
    queryOptions: options.queryOptions,
  });

export type GitlabListResult<TItem> = { items: TItem[]; total: number | null };

export type CreateGitlabListQueryOptions<TItem = unknown> =
  CreateGitlabQueryOptions<GitlabListResult<TItem>>;

export const createGitlabListQuery = <TItem = unknown>(
  options: CreateGitlabListQueryOptions<TItem>,
) =>
  createScopedQuery<GitlabListResult<TItem>, RestScope>({
    abortSignal: options.abortSignal,
    scope: () => scopeFor(options),
    disabledKey,
    queryKey: (scope) => requestKey('count', scope),
    queryFn: async (scope, signal) => {
      const response = await fetchResource(scope, signal);
      if (!response) return { items: [], total: 0 };
      const total = response.headers.get('X-Total');
      return {
        items: (await response.json()) as TItem[],
        total: total ? Number.parseInt(total, 10) : null,
      };
    },
    queryOptions: options.queryOptions,
  });
