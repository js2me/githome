import type { CloudCredentials } from '../forge/connection';
import type { ForgeAdapter } from '../forge/contracts';
import { createGithubClient } from './client';
import { createGithubMutations } from './mutations';
import { createGithubQueries } from './queries';

export const createGithubAdapter = (
  connection: Extract<CloudCredentials, { provider: 'github' }>,
): ForgeAdapter => {
  const request = createGithubClient(connection);
  return {
    ...createGithubQueries(request),
    ...createGithubMutations(request),
  };
};
