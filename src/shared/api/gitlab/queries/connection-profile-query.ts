import { type QueryObserverOptions, skipToken } from '@tanstack/query-core';
import { createQuery, queryClient } from 'mobx-tanstack-query/preset';
import type { GitLabUserDC } from '@/shared/api/gitlab';
import { getGitlabForgeAccount } from '@/shared/api/gitlab/endpoints/get-current-user';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';

export const gitlabProfileKey = (connection: GitLabConnection | null) =>
  [
    'gitlab-current-user',
    connection?.id ?? null,
    connection?.gitlabUrl ?? null,
    connection?.credentialsRevision ?? null,
  ] as const;

export const connectionProfileOptions = (connection: GitLabConnection | null) =>
  ({
    queryKey: gitlabProfileKey(connection),
    queryFn: connection
      ? ({ signal }) => getGitlabForgeAccount(connection, signal)
      : skipToken,
    enabled: Boolean(connection),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: false,
  }) satisfies QueryObserverOptions<GitLabUserDC>;

export const createConnectionUserIdQuery = (
  getConnection: () => GitLabConnection | null,
  abortSignal: AbortSignal,
) =>
  createQuery<GitLabUserDC, Error, number>(queryClient, () => ({
    ...connectionProfileOptions(getConnection()),
    select: (profile) => profile.id,
    abortSignal,
  }));

export const createConnectionProfileQuery = (
  getConnection: () => GitLabConnection | null,
  abortSignal: AbortSignal,
) =>
  createQuery(queryClient, () => ({
    ...connectionProfileOptions(getConnection()),
    abortSignal,
  }));
