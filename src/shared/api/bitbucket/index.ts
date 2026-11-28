import type { CloudCredentials } from '../forge/connection';
import type { ForgeAdapter } from '../forge/contracts';
import { createBitbucketClient } from './client';
import { createBitbucketMutations } from './mutations';
import { createBitbucketQueries } from './queries';

export const createBitbucketAdapter = (
  connection: Extract<CloudCredentials, { provider: 'bitbucket' }>,
): ForgeAdapter => {
  const request = createBitbucketClient(connection);
  return {
    ...createBitbucketQueries(request, connection.workspace),
    ...createBitbucketMutations(request),
  };
};
