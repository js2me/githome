import {
  type DefaultError,
  type GetNextPageParamFunction,
  type QueryKey,
  type QueryObserverOptions,
  skipToken,
} from '@tanstack/query-core';
import {
  createInfiniteQuery,
  createQuery,
  queryClient,
} from 'mobx-tanstack-query/preset';
import type {
  FetchQueryDynamicOptions,
  InfiniteFetchQueryDynamicOptions,
  MaybeFalsy,
} from './create-fetch-query';

interface ScopeOptions<TScope> {
  abortSignal: AbortSignal;
  scope: () => MaybeFalsy<TScope>;
  disabledKey: QueryKey;
  queryKey: (scope: TScope) => QueryKey;
}

type QueryOptions<TQueryFnData, TData> = FetchQueryDynamicOptions<TData> &
  Pick<
    QueryObserverOptions<TQueryFnData, DefaultError, TData>,
    'placeholderData'
  >;

export const createScopedQuery = <TQueryFnData, TScope, TData = TQueryFnData>(
  options: ScopeOptions<TScope> & {
    queryFn: (scope: TScope, signal: AbortSignal) => Promise<TQueryFnData>;
    queryOptions?:
      | QueryOptions<TQueryFnData, TData>
      | (() => QueryOptions<TQueryFnData, TData>);
  },
) =>
  createQuery<TQueryFnData, DefaultError, TData>(queryClient, () => {
    const scope = options.scope();
    const config = options.queryOptions;
    return {
      ...(typeof config === 'function' ? config() : config),
      abortSignal: options.abortSignal,
      enabled: Boolean(scope),
      queryKey: scope ? options.queryKey(scope) : options.disabledKey,
      queryFn: scope
        ? ({ signal }) => options.queryFn(scope, signal)
        : skipToken,
    };
  });

export const createScopedInfiniteQuery = <TPage, TScope, TCursor>(
  options: ScopeOptions<TScope> & {
    initialPageParam: TCursor;
    getNextPageParam: GetNextPageParamFunction<TCursor, TPage>;
    queryFn: (
      scope: TScope,
      cursor: TCursor,
      signal: AbortSignal,
    ) => Promise<TPage>;
    queryOptions?:
      | InfiniteFetchQueryDynamicOptions
      | (() => InfiniteFetchQueryDynamicOptions);
  },
) =>
  createInfiniteQuery<TPage, DefaultError, TCursor>(queryClient, () => {
    const scope = options.scope();
    const config = options.queryOptions;
    return {
      ...(typeof config === 'function' ? config() : config),
      abortSignal: options.abortSignal,
      enabled: Boolean(scope),
      queryKey: scope ? options.queryKey(scope) : options.disabledKey,
      initialPageParam: options.initialPageParam,
      getNextPageParam: options.getNextPageParam,
      queryFn: scope
        ? ({ pageParam, signal }) =>
            options.queryFn(scope, pageParam as TCursor, signal)
        : skipToken,
    };
  });
