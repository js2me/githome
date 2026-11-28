import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { fetchGitlabJson } from '../client';
import type { GitLabUserDC } from '../data-contracts';

export const getCurrentUser = async (
  connection: GitLabConnection,
  signal?: AbortSignal,
): Promise<GitLabUserDC> => {
  const { id, name, username, avatar_url } =
    await fetchGitlabJson<GitLabUserDC>(connection, '/user', {
      signal,
      cache: 'no-store',
    });
  return { id, name, username, avatar_url };
};

export const getGitlabForgeAccount = async (
  connection: GitLabConnection,
  signal?: AbortSignal,
) => {
  const user = await getCurrentUser(connection, signal);
  return { ...user, avatarUrl: user.avatar_url };
};

export const getCurrentUserId = async (
  connection: GitLabConnection,
  signal?: AbortSignal,
): Promise<number | null> => {
  const user = await getCurrentUser(connection, signal);
  return user.id ?? null;
};
