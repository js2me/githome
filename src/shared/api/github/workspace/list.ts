import type { CloudRequest } from '../../forge/cloud-client';

export const githubList = async <T>(
  request: CloudRequest,
  path: string,
  signal: AbortSignal,
) => {
  const { data, headers } = await request<T[]>(path, signal);
  if (!Array.isArray(data)) throw new Error('Invalid GitHub list response');
  return {
    items: data,
    nextCursor: headers.get('link')?.match(/<([^>]+)>\s*;\s*rel="next"/)?.[1],
  };
};
