import { createInfiniteQuery } from "mobx-tanstack-query/preset";
import type { DefaultError } from "@tanstack/query-core";
import {
  buildFetchQueryKey,
  buildFetchQueryUrl,
  type FetchQueryKey,
  type FetchQueryParams,
  type MaybeFalsy,
  parseFetchQueryKey,
  resolveFetchQueryParams,
  serializeFetchQuery,
} from "@/shared/lib/create-fetch-query";

export type FetchPageResult<TItem> = {
  items: TItem[];
  total: number | null;
  page: number;
  hasNextPage: boolean;
};

export type CreateInfiniteFetchQueryOptions = {
  abortSignal: AbortSignal;
  params: () => MaybeFalsy<FetchQueryParams>;
  initialPageParam?: number;
};

const getPerPage = (query: FetchQueryParams["query"]) => {
  const perPage = query?.per_page;

  if (perPage == null) {
    return undefined;
  }

  const parsed = Number.parseInt(String(perPage), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseFetchPageResult = async <TItem>(
  response: Response,
  pageParam: number,
  perPage: number | undefined,
): Promise<FetchPageResult<TItem>> => {
  const totalHeader = response.headers.get("X-Total");
  const totalPagesHeader = response.headers.get("X-Total-Pages");
  const nextPageHeader = response.headers.get("X-Next-Page");
  const currentPageHeader = response.headers.get("X-Page");
  const items = (await response.json()) as TItem[];
  const page = currentPageHeader
    ? Number.parseInt(currentPageHeader, 10)
    : pageParam;
  const totalPages = totalPagesHeader
    ? Number.parseInt(totalPagesHeader, 10)
    : null;

  let hasNextPage = false;

  if (nextPageHeader) {
    hasNextPage = true;
  } else if (totalPages != null) {
    hasNextPage = page < totalPages;
  } else if (perPage != null) {
    hasNextPage = items.length >= perPage;
  }

  return {
    items,
    total: totalHeader ? Number.parseInt(totalHeader, 10) : null,
    page,
    hasNextPage,
  };
};

export const createInfiniteFetchQuery = <TItem = unknown>(
  options: CreateInfiniteFetchQueryOptions,
) => {
  return createInfiniteQuery<
    FetchPageResult<TItem>,
    DefaultError,
    number
  >({
    abortSignal: options.abortSignal,
    initialPageParam: options.initialPageParam ?? 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    options: () => {
      const fetchParams = resolveFetchQueryParams(options.params());

      return {
        enabled: !!fetchParams,
        queryKey: buildFetchQueryKey(fetchParams),
      };
    },
    queryFn: async ({ pageParam, signal, queryKey }) => {
      const fetchParams = parseFetchQueryKey(queryKey as FetchQueryKey);

      if (!fetchParams) {
        throw new Error("Infinite fetch query is not configured");
      }

      const perPage = getPerPage(fetchParams.query);
      const serializedQuery = serializeFetchQuery({
        ...fetchParams.query,
        page: pageParam,
      });
      const url = buildFetchQueryUrl(fetchParams.path, serializedQuery);
      const response = await globalThis.fetch(url, {
        ...fetchParams.request,
        signal,
      });

      if (!response.ok) {
        if (fetchParams.notFoundAsNull && response.status === 404) {
          return {
            items: [],
            total: 0,
            page: pageParam,
            hasNextPage: false,
          } satisfies FetchPageResult<TItem>;
        }

        throw new Error(`Fetch error: ${response.status}`);
      }

      if (fetchParams.responseType === "text") {
        throw new Error("Infinite fetch query supports JSON responses only");
      }

      return parseFetchPageResult<TItem>(response, pageParam, perPage);
    },
  });
};
