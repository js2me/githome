import { actionBound, computed } from 'mobx';
import { WorkspaceVM } from '@/features/workspace-navigation';
import type { GitLabGroupDC } from '@/shared/api/gitlab';
import { getGroupContents } from '@/shared/api/gitlab/endpoints/groups/get-group-overview';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/connection/create-query';
import type { GroupPageVM } from './page-vm';

type GroupBranchProps = {
  tree: GroupPageVM;
  group: GitLabGroupDC;
  depth: number;
};

export class GroupBranchVM extends WorkspaceVM<GroupBranchProps> {
  readonly contents = createGitlabApiQuery({
    globals: this.globals,
    abortSignal: this.unmountSignal,
    params: () => (this.expanded ? { groupId: this.payload.group.id } : false),
    queryKey: ({ connection, groupId }) => [
      'group-contents',
      connection.id,
      connection.gitlabUrl,
      connection.credentialsRevision,
      groupId,
    ],
    queryFn: ({ connection, groupId, signal }) =>
      getGroupContents(connection, groupId, signal),
    queryOptions: { staleTime: 60_000, retry: false },
  });

  @computed
  get expanded() {
    const { tree, group } = this.payload;
    return tree.expanded.has(group.id);
  }

  @actionBound
  toggle() {
    const { tree, group } = this.payload;
    tree.toggleGroup(group.id);
  }
}
