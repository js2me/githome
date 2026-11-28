import { actionBound, computed } from 'mobx';
import { WorkspaceVM } from '@/features/workspace-navigation';
import type { GitLabGroupDC } from '@/shared/api/gitlab';
import { createGroupContentsQuery } from '@/shared/api/gitlab/queries/groups';
import type { GroupPageVM } from './page-vm';

type GroupBranchProps = {
  tree: GroupPageVM;
  group: GitLabGroupDC;
  depth: number;
};

export class GroupBranchVM extends WorkspaceVM<GroupBranchProps> {
  readonly contents = createGroupContentsQuery({
    globals: this.globals,
    abortSignal: this.unmountSignal,
    params: () => (this.expanded ? { groupId: this.payload.group.id } : false),
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
