import { type QueryKey, skipToken } from '@tanstack/query-core';
import { createQuery, queryClient } from 'mobx-tanstack-query/preset';
import type { ForgeSession } from '@/shared/api/forge/adapter';
import type {
  ForgeComment,
  ForgePage,
  ForgePullRequestRef,
} from '@/shared/api/forge/contracts';
import {
  createScopedInfiniteQuery,
  createScopedQuery,
} from '@/shared/lib/query/create-scoped-query';
import { forgeCommentsKey, forgeKey, forgePostedCommentsKey } from './keys';

const disabledKey = ['forge', null] as const;
type Scope<T> = { session: ForgeSession; resource: T };

const createForgeList = <T, R>(
  abortSignal: AbortSignal,
  getScope: () => Scope<R> | null,
  key: (scope: Scope<R>) => QueryKey,
  load: (
    scope: Scope<R>,
    cursor: string | undefined,
    signal: AbortSignal,
  ) => Promise<ForgePage<T>>,
) =>
  createScopedInfiniteQuery<ForgePage<T>, Scope<R>, string | undefined>({
    abortSignal,
    scope: getScope,
    disabledKey,
    queryKey: key,
    queryFn: load,
    initialPageParam: undefined,
    getNextPageParam: (lastPage, _allPages, _lastParam, allParams) =>
      allParams.includes(lastPage.nextCursor) ? undefined : lastPage.nextCursor,
  });

export const createForgeAccountQuery = (
  session: () => ForgeSession | null,
  abortSignal: AbortSignal,
) =>
  createScopedQuery({
    abortSignal,
    scope: session,
    disabledKey,
    queryOptions: {
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    queryKey: (active) => active.profileKey,
    queryFn: (active, signal) => active.adapter.getAccount(signal),
  });

export const createForgeRepositoryList = (
  session: () => ForgeSession,
  abortSignal: AbortSignal,
) =>
  createForgeList(
    abortSignal,
    () => ({ session: session(), resource: null }),
    ({ session }) => forgeKey(session, 'repositories'),
    ({ session }, cursor, signal) =>
      session.adapter.listRepositories(cursor, signal),
  );

export const createForgePullRequestList = (
  scope: () => Scope<string> | null,
  abortSignal: AbortSignal,
) =>
  createForgeList(
    abortSignal,
    scope,
    ({ session, resource }) =>
      forgeKey(session, 'repositories', resource, 'pull-requests', 'open'),
    ({ session, resource }, cursor, signal) =>
      session.adapter.listOpenPullRequests(resource, cursor, signal),
  );

export const createForgePullRequestQuery = (
  scope: () => Scope<ForgePullRequestRef> | null,
  abortSignal: AbortSignal,
) =>
  createScopedQuery({
    abortSignal,
    scope,
    disabledKey,
    queryKey: ({ session, resource }) =>
      forgeKey(
        session,
        'repositories',
        resource.repositoryId,
        'pull-requests',
        resource.number,
      ),
    queryFn: ({ session, resource }, signal) =>
      session.adapter.getPullRequest(resource, signal),
  });

export const createForgeCommentList = (
  scope: () => Scope<ForgePullRequestRef> | null,
  abortSignal: AbortSignal,
) =>
  createForgeList(
    abortSignal,
    scope,
    ({ session, resource }) => forgeCommentsKey(session, resource),
    ({ session, resource }, cursor, signal) =>
      session.adapter.listComments(resource, cursor, signal),
  );

export const createForgePostedCommentsQuery = (
  getScope: () => Scope<ForgePullRequestRef> | null,
  abortSignal: AbortSignal,
) =>
  createQuery<ForgeComment[]>(queryClient, () => {
    const scope = getScope();
    return {
      abortSignal,
      queryKey: scope
        ? forgePostedCommentsKey(scope.session, scope.resource)
        : disabledKey,
      // This cache entry is populated by successful POSTs, never by a fetch.
      queryFn: skipToken,
    };
  });
