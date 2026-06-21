import { createQuery } from "mobx-tanstack-query/preset";
import type { DefaultError } from "@tanstack/query-core";
import type { Globals } from "@/globals";
import { buildGitlabRequestHeaders, resolveGitlabRequestUrl } from "@/shared/api/gitlab";
import {
  buildFetchQueryKey,
  buildFetchQueryUrl,
  createFetchQuery,
  type CreateFetchQueryOptions,
  type FetchQueryParams,
  type MaybeFalsy,
  parseFetchQueryKey,
  resolveFetchQueryParams,
  serializeFetchQuery,
} from "@/shared/lib/create-fetch-query";
import { createInfiniteFetchQuery } from "@/shared/lib/create-infinite-fetch-query";

type GitlabFetchQueryParams = MaybeFalsy<
  Pick<FetchQueryParams, "path" | "query" | "notFoundAsNull" | "responseType">
>;

export type CreateGitlabQueryOptions<TData> = {
  globals: Globals;
  abortSignal: AbortSignal;
  select?: CreateFetchQueryOptions<TData>["select"];
  params: () => GitlabFetchQueryParams;
};

const resolveGitlabFetchParams = (
  globals: Globals,
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
        "PRIVATE-TOKEN": connection.gitToken,
      }),
    },
  };
};

export const createGitlabQuery = <TData = unknown>(
  options: CreateGitlabQueryOptions<TData>,
) => {
  const { globals, abortSignal, select } = options;

  return createFetchQuery({
    abortSignal,
    select,
    params: () => resolveGitlabFetchParams(globals, options.params),
  });
};

export type CreateInfiniteGitlabQueryOptions = {
  globals: Globals;
  abortSignal: AbortSignal;
  initialPageParam?: number;
  params: () => GitlabFetchQueryParams;
};

export const createInfiniteGitlabQuery = <TItem = unknown>(
  options: CreateInfiniteGitlabQueryOptions,
) => {
  const { globals, abortSignal, initialPageParam } = options;

  return createInfiniteFetchQuery<TItem>({
    abortSignal,
    initialPageParam,
    params: () => resolveGitlabFetchParams(globals, options.params),
  });
};

export type GitlabListResult<TItem> = {
  items: TItem[];
  total: number | null;
};

export type CreateGitlabListQueryOptions = {
  globals: Globals;
  abortSignal: AbortSignal;
  params: () => GitlabFetchQueryParams;
};

export const createGitlabListQuery = <TItem = unknown>(
  options: CreateGitlabListQueryOptions,
) => {
  const { globals, abortSignal } = options;

  return createQuery<GitlabListResult<TItem>, DefaultError, GitlabListResult<TItem>>({
    abortSignal,
    options: () => {
      const fetchParams = resolveGitlabFetchParams(globals, options.params);

      return {
        enabled: !!fetchParams,
        queryKey: buildFetchQueryKey(fetchParams),
      };
    },
    queryFn: async ({ signal, queryKey }) => {
      const fetchParams = parseFetchQueryKey(queryKey as Parameters<
        typeof parseFetchQueryKey
      >[0]);

      if (!fetchParams) {
        throw new Error("GitLab list query is not configured");
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

        throw new Error(`Fetch error: ${response.status}`);
      }

      const totalHeader = response.headers.get("X-Total");
      const items = (await response.json()) as TItem[];

      return {
        items,
        total: totalHeader ? Number.parseInt(totalHeader, 10) : null,
      } satisfies GitlabListResult<TItem>;
    },
  });
};
