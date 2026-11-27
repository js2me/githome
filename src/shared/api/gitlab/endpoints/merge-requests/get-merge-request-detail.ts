import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabFetch } from '../../client';
import type {
  GitLabMergeRequestDC,
  GitLabProjectDC,
} from '../../data-contracts';

export const getMergeRequestDetail = async (
  connection: GitLabConnection,
  project: Pick<GitLabProjectDC, 'id'> | string | number,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestDC> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${typeof project === 'object' ? project.id : encodeURIComponent(project)}/merge_requests/${mergeRequestIid}?render_html=true`,
    signal,
    { cache: 'no-store' },
  );

  return (await response.json()) as GitLabMergeRequestDC;
};
