import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabPut } from '../../../client';
import type { GitLabMergeRequestDC } from '../../../data-contracts';

export const closeMergeRequest = (
  connection: GitLabConnection,
  projectId: number,
  mergeRequestIid: number,
): Promise<GitLabMergeRequestDC> =>
  gitlabPut(
    connection,
    `/projects/${projectId}/merge_requests/${mergeRequestIid}`,
    { state_event: 'close' },
  );
