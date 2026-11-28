import { queryClient } from 'mobx-tanstack-query/preset';
import { expect, it, vi } from 'vitest';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { defineGitlabMutation } from './define-mutation';

it('uses TanStack mutation lifecycle without storing tokens as mutation keys or retrying writes', async () => {
  const connection = {
    id: 'account',
    credentialsRevision: 'revision',
    gitlabUrl: 'https://gitlab.example',
    gitToken: 'test-private-token',
  };
  const cache = queryClient.getMutationCache();
  const observed = vi.fn();
  const unsubscribe = cache.subscribe((event) => {
    if (event.type === 'added') observed(event.mutation.options.mutationKey);
  });
  const failure = new Error('Rejected by GitLab');
  const write = vi.fn(async (_connection: GitLabConnection, _id: number) => {
    throw failure;
  });
  try {
    const mutate = defineGitlabMutation('example-write', write);
    await expect(mutate(connection, 42)).rejects.toBe(failure);
    expect(write).toHaveBeenCalledExactlyOnceWith(connection, 42);
    expect(observed).toHaveBeenCalledExactlyOnceWith([
      'gitlab',
      'account',
      'revision',
      'example-write',
    ]);
    expect(cache.getAll()).toHaveLength(0);
  } finally {
    unsubscribe();
  }
});
