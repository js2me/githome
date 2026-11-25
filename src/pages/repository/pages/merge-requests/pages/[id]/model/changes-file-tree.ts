import {
  actionBound,
  computed,
  type IObservableValue,
  observable,
  reaction,
} from 'mobx';
import { createRef } from 'yummies/mobx';
import type {
  GitLabDiscussionDC,
  GitLabMergeRequestChangeDC,
} from '@/shared/api/gitlab';
import {
  buildChangesTree,
  type ChangesTreeNode,
} from '@/shared/lib/build-changes-tree';
import { buildChangeFileKeysWithDiscussions } from '@/shared/lib/gitlab/diff-discussions';
import { VM } from '@/shared/lib/view-models/vm';

const matchesSearchPattern = (path: string, query: string) => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }

  const normalizedPath = path.toLowerCase();

  if (trimmed.includes('*')) {
    const pattern = trimmed
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`(^|/)${pattern}$`).test(normalizedPath);
  }

  return normalizedPath.includes(trimmed);
};

const filterTreeNodes = (
  nodes: ChangesTreeNode[],
  query: string,
): ChangesTreeNode[] => {
  const trimmed = query.trim();
  if (!trimmed) {
    return nodes;
  }

  const filtered: ChangesTreeNode[] = [];

  for (const node of nodes) {
    if (node.type === 'file') {
      if (matchesSearchPattern(node.path, trimmed)) {
        filtered.push(node);
      }
      continue;
    }

    const children = filterTreeNodes(node.children, trimmed);
    if (children.length > 0 || matchesSearchPattern(node.path, trimmed)) {
      filtered.push({
        ...node,
        children,
      });
    }
  }

  return filtered;
};

const findFolderPathsToFile = (
  nodes: ChangesTreeNode[],
  fileId: string,
  ancestors: string[] = [],
): string[] | null => {
  for (const node of nodes) {
    if (node.type === 'file') {
      if (node.id === fileId) {
        return ancestors;
      }
      continue;
    }

    const found = findFolderPathsToFile(node.children, fileId, [
      ...ancestors,
      node.path,
    ]);

    if (found) {
      return found;
    }
  }

  return null;
};

interface ChangesTreeRow {
  key: string;
  node: ChangesTreeNode;
  depth: number;
}

const flattenVisibleRows = (
  nodes: ChangesTreeNode[],
  collapsedPaths: ReadonlySet<string>,
  depth = 0,
  rows: ChangesTreeRow[] = [],
): ChangesTreeRow[] => {
  for (const node of nodes) {
    rows.push({
      key: node.type === 'folder' ? `folder:${node.path}` : node.id,
      node,
      depth,
    });
    if (node.type === 'folder' && !collapsedPaths.has(node.path)) {
      flattenVisibleRows(node.children, collapsedPaths, depth + 1, rows);
    }
  }
  return rows;
};

export class ChangesFileTreeVM extends VM<{
  changes: GitLabMergeRequestChangeDC[];
  discussions: GitLabDiscussionDC[];
  activeFile: IObservableValue<string | null>;
  onSelectFile: (fileKey: string) => void;
}> {
  readonly nav = createRef<HTMLElement>();
  readonly collapsedPaths = observable.set<string>();
  @observable accessor searchQuery = '';

  @computed
  get tree() {
    return buildChangesTree(this.payload.changes);
  }

  @computed
  get fileKeysWithDiscussions() {
    return buildChangeFileKeysWithDiscussions(
      this.payload.discussions,
      this.payload.changes,
    );
  }

  @computed
  get rows() {
    return flattenVisibleRows(
      filterTreeNodes(this.tree, this.searchQuery),
      this.collapsedPaths,
    );
  }

  @computed
  get activeIndex() {
    const active = this.payload.activeFile.get();
    return this.rows.findIndex((row) => row.key === active);
  }

  willMount() {
    reaction(
      () => this.tree,
      () => this.collapsedPaths.clear(),
      { signal: this.unmountSignal },
    );
    reaction(
      () => [this.tree, this.payload.activeFile.get()] as const,
      ([tree, active]) => {
        if (active) {
          for (const path of findFolderPathsToFile(tree, active) ?? [])
            this.collapsedPaths.delete(path);
        }
      },
      { fireImmediately: true, signal: this.unmountSignal },
    );
  }

  @actionBound
  toggleFolder(path: string) {
    if (!this.collapsedPaths.delete(path)) this.collapsedPaths.add(path);
  }

  @actionBound
  search(query: string) {
    this.searchQuery = query;
  }
}
