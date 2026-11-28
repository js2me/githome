import { queryClient } from 'mobx-tanstack-query/preset';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import type { GitLabMergeRequestDC } from '../../data-contracts';
import { gitlabRestResourceKey } from '../core/keys';
import { mergeRequestDetailKey } from './detail-key';

export const invalidateProjectMergeRequests = (
  connection: GitLabConnection,
  projectId: number,
) =>
  queryClient.invalidateQueries({
    queryKey: gitlabRestResourceKey(
      connection,
      `/projects/${projectId}/merge_requests`,
    ),
  });

export const seedMergeRequestDetail = (
  connection: GitLabConnection,
  projectId: number,
  request: GitLabMergeRequestDC,
) =>
  queryClient.setQueryData(
    mergeRequestDetailKey(connection, projectId, request.iid),
    request,
  );

export const updateMergeRequestDetailCache = (
  connection: GitLabConnection,
  projectId: number,
  iid: number,
  updated: Partial<GitLabMergeRequestDC>,
  refetch: boolean,
) => {
  const key = mergeRequestDetailKey(connection, projectId, iid);
  queryClient.setQueryData<GitLabMergeRequestDC>(key, (current) =>
    current ? { ...current, ...updated } : undefined,
  );
  void invalidateProjectMergeRequests(connection, projectId);
  if (refetch)
    void queryClient.invalidateQueries({ queryKey: key, exact: true });
};
