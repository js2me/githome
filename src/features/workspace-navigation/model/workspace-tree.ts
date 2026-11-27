import type { NavTreeStore } from '@/shared/lib/navigation/nav-tree';
import {
  isMergeRequestNavItem,
  type MergeRequestNavItem,
  REPOSITORY_NAV_GROUP_KIND,
  type RepositoryNavGroup,
} from './merge-request-nav';

interface NamespaceBranch {
  kind: 'namespace';
  id: string;
  label: string;
  path: string;
  connectionId: string;
  children: WorkspaceBranch[];
}

interface ProjectBranch {
  kind: 'project';
  id: string;
  label: string;
  group: RepositoryNavGroup;
  items: MergeRequestNavItem[];
}

export type WorkspaceBranch = NamespaceBranch | ProjectBranch;

export function buildWorkspaceTree(
  store: Pick<NavTreeStore, 'groups' | 'items'>,
) {
  const itemsByGroup = new Map<string, MergeRequestNavItem[]>();
  for (const item of store.items) {
    if (!isMergeRequestNavItem(item)) continue;
    const items = itemsByGroup.get(item.groupId);
    if (items) items.push(item);
    else itemsByGroup.set(item.groupId, [item]);
  }

  const roots: WorkspaceBranch[] = [];
  const namespaces = new Map<string, NamespaceBranch>();
  for (const group of store.groups) {
    if (group.kind !== REPOSITORY_NAV_GROUP_KIND) continue;
    const repository = group as RepositoryNavGroup;
    const { connectionId, personalNamespace } = repository.payload ?? {};
    const items = itemsByGroup.get(group.id);
    if (!items?.length || !connectionId) continue;

    const parts = group.title.split('/').filter(Boolean);
    const projectLabel = personalNamespace ? group.title : (parts.pop() ?? '');
    let children = roots;
    if (!personalNamespace) {
      let path = '';
      for (const part of parts) {
        path = path ? `${path}/${part}` : part;
        const id = `namespace:${connectionId}:${path}`;
        let branch = namespaces.get(id);
        if (!branch) {
          branch = {
            kind: 'namespace',
            id,
            label: part,
            path,
            connectionId,
            children: [],
          };
          namespaces.set(id, branch);
          children.push(branch);
        }
        children = branch.children;
      }
    }
    children.push({
      kind: 'project',
      id: group.id,
      label: projectLabel,
      group: repository,
      items,
    });
  }
  return roots;
}
