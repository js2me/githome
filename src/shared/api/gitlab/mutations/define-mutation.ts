import { queryClient } from 'mobx-tanstack-query/preset';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';

export const defineGitlabMutation =
  <TArgs extends unknown[], TResult>(
    name: string,
    mutate: (connection: GitLabConnection, ...args: TArgs) => Promise<TResult>,
  ) =>
  async (connection: GitLabConnection, ...args: TArgs): Promise<TResult> => {
    const cache = queryClient.getMutationCache();
    const mutation = cache.build<TResult, Error, void, unknown>(queryClient, {
      mutationKey: [
        'gitlab',
        connection.id,
        connection.credentialsRevision ?? null,
        name,
      ],
      mutationFn: () => mutate(connection, ...args),
      retry: false,
      // A write runs against the account and target captured when it was submitted.
      // Do not queue it to run later after reconnecting.
      networkMode: 'always',
    });

    try {
      return await mutation.execute(undefined);
    } finally {
      cache.remove(mutation);
    }
  };
