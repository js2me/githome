import {
  type DefaultError,
  type QueryObserverOptions,
  skipToken,
} from '@tanstack/query-core';
import { createQuery, queryClient } from 'mobx-tanstack-query/preset';
import {
  buildGitlabRequestHeaders,
  resolveGitlabRequestUrl,
} from '@/shared/api/gitlab';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import {
  buildFetchQueryKey,
  buildFetchQueryUrl,
  type CreateFetchQueryOptions,
  createFetchQuery,
  type FetchQueryDynamicOptions,
  type FetchQueryParams,
  type MaybeFalsy,
  parseFetchQueryKey,
  resolveFetchQueryParams,
  resolveQueryOptions,
  serializeFetchQuery,
} from '@/shared/lib/query/create-fetch-query';
import {
  type CreateInfiniteFetchQueryOptions,
  createInfiniteFetchQuery,
} from '@/shared/lib/query/create-infinite-fetch-query';

interface GitlabQueryContext {
  readonly stores: {
    readonly settings: { readonly activeConnection: GitLabConnection | null };
  };
}

type GitlabFetchQueryParams = MaybeFalsy<
  Pick<FetchQueryParams, 'path' | 'query' | 'notFoundAsNull' | 'responseType'>
>;

export type CreateGitlabQueryOptions<TData = unknown> = {
  globals: GitlabQueryContext;
  abortSignal: AbortSignal;
  params: () => GitlabFetchQueryParams;
  queryOptions?: CreateFetchQueryOptions<TData>['queryOptions'];
};

const resolveGitlabFetchParams = (
  globals: GitlabQueryContext,
  params: () => GitlabFetchQueryParams,
): FetchQueryParams | null => {
  const connection = globals.stores.settings.activeConnection;
  if (!connection) {
    return null;
  }

  const fetchParams = resolveFetchQueryParams(params());
  if (!fetchParams) {
    return null;
  }

  return {
    path: resolveGitlabRequestUrl(
      connection.gitlabUrl,
      `/api/v4${fetchParams.path}`,
    ),
    query: fetchParams.query,
    notFoundAsNull: fetchParams.notFoundAsNull,
    responseType: fetchParams.responseType,
    request: {
      headers: buildGitlabRequestHeaders(connection.gitlabUrl, {
        'PRIVATE-TOKEN': connection.gitToken,
      }),
    },
  };
};

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
  return createQuery<TData, DefaultError, TData>(queryClient, () => {
    const connection = options.globals.stores.settings.activeConnection;
    const params = options.params();

    if (!connection || !params) {
      return {
        abortSignal: options.abortSignal,
        enabled: false,
        queryKey: ['gitlab-api', null] as const,
        queryFn: skipToken,
        ...options.queryOptions,
      };
    }

    // Keep the request parameters tied to the key even when a fetch is retried.
    const resolved = { connection, ...params };
    return {
      abortSignal: options.abortSignal,
      enabled: true,
      queryKey: options.queryKey(resolved),
      queryFn: ({ signal }) => options.queryFn({ ...resolved, signal }),
      ...options.queryOptions,
    };
  });
};

export const createGitlabQuery = <TData = unknown>(
  options: CreateGitlabQueryOptions<TData>,
) => {
  return createFetchQuery<TData>({
    abortSignal: options.abortSignal,
    params: () => resolveGitlabFetchParams(options.globals, options.params),
    queryOptions: options.queryOptions,
  });
};

export type CreateInfiniteGitlabQueryOptions = {
  globals: GitlabQueryContext;
  abortSignal: AbortSignal;
  initialPageParam?: number;
  params: () => GitlabFetchQueryParams;
  queryOptions?: CreateInfiniteFetchQueryOptions['queryOptions'];
};

export const createInfiniteGitlabQuery = <TItem = unknown>(
  options: CreateInfiniteGitlabQueryOptions,
) => {
  return createInfiniteFetchQuery<TItem>({
    abortSignal: options.abortSignal,
    initialPageParam: options.initialPageParam,
    params: () => resolveGitlabFetchParams(options.globals, options.params),
    queryOptions: options.queryOptions,
  });
};

export type GitlabListResult<TItem> = {
  items: TItem[];
  total: number | null;
};

export type CreateGitlabListQueryOptions<TItem = unknown> = {
  globals: GitlabQueryContext;
  abortSignal: AbortSignal;
  params: () => GitlabFetchQueryParams;
  queryOptions?:
    | FetchQueryDynamicOptions<GitlabListResult<TItem>>
    | (() => FetchQueryDynamicOptions<GitlabListResult<TItem>>);
};

export const createGitlabListQuery = <TItem = unknown>(
  options: CreateGitlabListQueryOptions<TItem>,
) => {
  const { globals, abortSignal } = options;

  return createQuery<
    GitlabListResult<TItem>,
    DefaultError,
    GitlabListResult<TItem>
  >({
    abortSignal,
    options: () => {
      const fetchParams = resolveGitlabFetchParams(globals, options.params);

      return {
        enabled: !!fetchParams,
        queryKey: buildFetchQueryKey(fetchParams),
        ...resolveQueryOptions(options.queryOptions),
      };
    },
    queryFn: async ({ signal, queryKey }) => {
      const fetchParams = parseFetchQueryKey(
        queryKey as Parameters<typeof parseFetchQueryKey>[0],
      );

      if (!fetchParams) {
        throw new Error('GitLab list query is not configured');
      }

      const serializedQuery = serializeFetchQuery(fetchParams.query);
      const url = buildFetchQueryUrl(fetchParams.path, serializedQuery);
      const response = await globalThis.fetch(url, {
        ...fetchParams.request,
        signal,
      });

      if (!response.ok) {
        if (fetchParams.notFoundAsNull && response.status === 404) {
          return { items: [], total: 0 };
        }

        throw new LocalizedError('connection.requestFailedHttp', {
          v1: response.status,
        });
      }

      const totalHeader = response.headers.get('X-Total');
      const items = (await response.json()) as TItem[];

      return {
        items,
        total: totalHeader ? Number.parseInt(totalHeader, 10) : null,
      } satisfies GitlabListResult<TItem>;
    },
  });
};
