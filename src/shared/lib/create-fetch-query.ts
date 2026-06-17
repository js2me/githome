import { createQuery } from "mobx-tanstack-query/preset";
import type { DefaultError } from "@tanstack/query-core";

export type MaybeFalsy<T> = T | false | null | undefined;

export type FetchQueryParams = {
  path: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  request?: Partial<Omit<RequestInit, "signal">>;
  notFoundAsNull?: boolean;
  responseType?: "json" | "text";
};

type FetchQueryKeyMeta = {
  notFoundAsNull?: boolean;
  responseType?: FetchQueryParams["responseType"];
  request?: Partial<Omit<RequestInit, "signal">>;
};

export type FetchQueryKey = readonly (
  | string
  | Record<string, string>
  | FetchQueryKeyMeta
  | null
)[];

export type CreateFetchQueryOptions<TData> = {
  abortSignal: AbortSignal;
  params: () => MaybeFalsy<FetchQueryParams>;
  select?: (data: unknown) => TData;
};

export const serializeFetchQuery = (
  query?: FetchQueryParams["query"],
): Record<string, string> | null => {
  if (!query) {
    return null;
  }

  const entries = Object.entries(query)
    .filter(([, value]) => value != null)
    .map(([key, value]) => [key, String(value)] as const);

  return entries.length ? Object.fromEntries(entries) : null;
};

export const resolveFetchQueryParams = (
  params: MaybeFalsy<FetchQueryParams>,
): FetchQueryParams | null => {
  if (!params) {
    return null;
  }

  return params;
};

export const buildFetchQueryUrl = (
  path: string,
  query: Record<string, string> | null,
): string => {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams(query);
  const queryString = params.toString();

  if (!queryString) {
    return path;
  }

  return path.includes("?")
    ? `${path}&${queryString}`
    : `${path}?${queryString}`;
};

export const buildFetchQueryKey = (
  fetchParams: FetchQueryParams | null,
): FetchQueryKey => {
  if (!fetchParams) {
    return [null];
  }

  return [
    ...fetchParams.path.split("/"),
    serializeFetchQuery(fetchParams.query),
    {
      notFoundAsNull: fetchParams.notFoundAsNull,
      responseType: fetchParams.responseType,
      request: fetchParams.request,
    },
  ];
};

export const parseFetchQueryKey = (
  queryKey: FetchQueryKey,
): FetchQueryParams | null => {
  if (!queryKey.length || queryKey[0] === null) {
    return null;
  }

  const meta = queryKey[queryKey.length - 1] as FetchQueryKeyMeta;
  const serializedQuery = queryKey[queryKey.length - 2] as
    | Record<string, string>
    | null;
  const path = (queryKey.slice(0, -2) as string[]).join("/");

  return {
    path,
    query: serializedQuery ?? undefined,
    notFoundAsNull: meta.notFoundAsNull,
    responseType: meta.responseType,
    request: meta.request,
  };
};

export const createFetchQuery = <TData = unknown>(
  options: CreateFetchQueryOptions<TData>,
) => {
  return createQuery<unknown, DefaultError, TData>({
    abortSignal: options.abortSignal,
    options: () => {
      const fetchParams = resolveFetchQueryParams(options.params());

      return {
        enabled: !!fetchParams,
        select: options.select,
        queryKey: buildFetchQueryKey(fetchParams),
      };
    },
    queryFn: async ({ signal, queryKey }) => {
      const fetchParams = parseFetchQueryKey(queryKey as FetchQueryKey);

      if (!fetchParams) {
        throw new Error("Fetch query is not configured");
      }

      const serializedQuery = serializeFetchQuery(fetchParams.query);
      const url = buildFetchQueryUrl(fetchParams.path, serializedQuery);
      const response = await globalThis.fetch(url, {
        ...fetchParams.request,
        signal,
      });

      if (!response.ok) {
        if (fetchParams.notFoundAsNull && response.status === 404) {
          return null;
        }

        throw new Error(`Fetch error: ${response.status}`);
      }

      if (fetchParams.responseType === "text") {
        return await response.text();
      }

      return await response.json();
    },
  });
};
