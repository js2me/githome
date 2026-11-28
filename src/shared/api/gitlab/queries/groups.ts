import {
  getGroupContents,
  getGroupOverview,
} from '@/shared/api/gitlab/endpoints/groups/get-group-overview';
import { defineGitlabApiQuery } from '@/shared/api/gitlab/queries/core/define-query';
import { gitlabConnectionKey } from './core/keys';

export const createGroupContentsQuery = defineGitlabApiQuery<
  Awaited<ReturnType<typeof getGroupContents>>,
  { groupId: number }
>({
  queryKey: ({ connection, groupId }) => [
    'group-contents',
    ...gitlabConnectionKey(connection),
    groupId,
  ],
  queryFn: ({ connection, groupId, signal }) =>
    getGroupContents(connection, groupId, signal),
  queryOptions: { staleTime: 60_000, retry: false },
});

export const createGroupOverviewQuery = defineGitlabApiQuery<
  Awaited<ReturnType<typeof getGroupOverview>>,
  { groupPath: string }
>({
  queryKey: ({ connection, groupPath }) => [
    'group-overview',
    ...gitlabConnectionKey(connection),
    groupPath,
  ],
  queryFn: ({ connection, groupPath, signal }) =>
    getGroupOverview(connection, groupPath, signal),
});
