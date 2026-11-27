import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabFetch } from '../../client';
import type { GitLabProjectDC } from '../../data-contracts';

export const getProject = async (
  connection: GitLabConnection,
  projectId: number | string,
  signal?: AbortSignal,
): Promise<GitLabProjectDC> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${encodeURIComponent(projectId)}`,
    signal,
  );

  return (await response.json()) as GitLabProjectDC;
};
