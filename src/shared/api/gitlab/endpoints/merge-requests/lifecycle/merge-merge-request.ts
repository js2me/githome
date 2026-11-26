import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabPut } from '../../../client';
import type { GitLabMergeRequestDC } from '../../../data-contracts';

export const mergeMergeRequest = (
  connection: GitLabConnection,
  projectId: number,
  mergeRequestIid: number,
  sha: string,
): Promise<GitLabMergeRequestDC> =>
  gitlabPut(
    connection,
    `/projects/${projectId}/merge_requests/${mergeRequestIid}/merge`,
    { sha },
  );
