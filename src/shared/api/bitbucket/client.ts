import { createCloudClient } from '../forge/cloud-client';
import type { CloudCredentials } from '../forge/connection';

export const createBitbucketClient = ({
  email,
  gitToken,
}: Extract<CloudCredentials, { provider: 'bitbucket' }>) =>
  createCloudClient('bitbucket', {
    Authorization: `Basic ${btoa(String.fromCharCode(...new TextEncoder().encode(`${email}:${gitToken}`)))}`,
  });
