import { createCloudClient } from '../forge/cloud-client';
import type { CloudCredentials } from '../forge/connection';

export const createGithubClient = ({
  gitToken,
}: Extract<CloudCredentials, { provider: 'github' }>) =>
  createCloudClient('github', {
    Authorization: `Bearer ${gitToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
  });
