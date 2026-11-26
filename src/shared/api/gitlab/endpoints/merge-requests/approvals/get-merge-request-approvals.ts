import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabFetch } from '../../../client';
import type {
  GitLabMergeRequestApprovalsDC,
  GitLabProjectDC,
} from '../../../data-contracts';

export const getMergeRequestApprovals = async (
  connection: GitLabConnection,
  project: Pick<GitLabProjectDC, 'id'>,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestApprovalsDC> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/approvals`,
    signal,
  );

  return (await response.json()) as GitLabMergeRequestApprovalsDC;
};
