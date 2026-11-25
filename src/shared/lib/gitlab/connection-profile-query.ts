import { skipToken, type QueryObserverOptions } from "@tanstack/query-core";
import { createQuery, queryClient } from "mobx-tanstack-query/preset";
import type { GitLabUserDC } from "@/shared/api/gitlab";
import { getCurrentUser } from "@/shared/api/gitlab/endpoints/get-current-user";
import type { GitLabConnection } from "./connection";

export const connectionProfileOptions = (connection: GitLabConnection | null) => ({
  queryKey: ["gitlab-current-user", connection?.id ?? null, connection?.credentialsRevision ?? null],
  queryFn: connection ? ({ signal }) => getCurrentUser(connection, signal) : skipToken,
  enabled: Boolean(connection),
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: false,
} satisfies QueryObserverOptions<GitLabUserDC>);

export const createConnectionUserIdQuery = (
  getConnection: () => GitLabConnection | null,
  abortSignal: AbortSignal,
) => createQuery<GitLabUserDC, Error, number>(queryClient, () => ({
  ...connectionProfileOptions(getConnection()),
  select: (profile) => profile.id,
  abortSignal,
}));
