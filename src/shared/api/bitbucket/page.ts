import type { CloudRequest } from '../forge/cloud-client';

export const fetchBitbucketPage = async <T>(
  request: CloudRequest,
  path: string,
  signal: AbortSignal,
) => {
  const { data } = await request<{ values: T[]; next?: string }>(path, signal);
  if (!Array.isArray(data.values)) {
    throw new Error('Invalid Bitbucket list response');
  }
  return data;
};
