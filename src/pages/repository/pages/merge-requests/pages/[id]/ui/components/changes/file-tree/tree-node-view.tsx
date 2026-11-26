import { Comment } from '@gravity-ui/icons';
import { type CSSProperties, memo } from 'react';
import { cn } from '@/shared/lib/cn';
import { getChangesTreeFileDataId } from '@/shared/lib/diff/diff-search';
import type { ChangesTreeNode } from '@/shared/lib/file-tree/build-changes-tree';
import { FileTypeIcon } from '@/shared/ui/file-type-icon';
import { FileStatusIcon } from './file-status-icon';

export const TreeNodeView = memo(
  ({
    node,
    depth,
    isActive,
    expanded,
    hasDiscussions,
    onToggleFolder,
    onSelectFile,
  }: {
    node: ChangesTreeNode;
    depth: number;
    isActive: boolean;
    expanded: boolean;
    hasDiscussions: boolean;
    onToggleFolder: (path: string) => void;
    onSelectFile: (fileKey: string) => void;
  }) => {
    const className = cn(
      'changes-file-tree__row',
      depth > 0 && 'changes-file-tree__row--branch',
      isActive && 'changes-file-tree__row--active',
    );
    const style = { '--tree-depth': depth } as CSSProperties;

    if (node.type === 'folder') {
      return (
        <button
          className={className}
          type="button"
          style={style}
          aria-expanded={expanded}
          onClick={() => onToggleFolder(node.path)}
        >
          <span className="changes-file-tree__row-icon">
            <FileTypeIcon path={node.path} folder expanded={expanded} />
          </span>
          <span className="changes-file-tree__row-label">{node.name}</span>
        </button>
      );
    }

    return (
      <button
        className={className}
        type="button"
        data-changes-file-id={getChangesTreeFileDataId(node.id)}
        aria-current={isActive || undefined}
        style={style}
        title={node.path}
        onClick={() => onSelectFile(node.id)}
      >
        <span className="changes-file-tree__row-icon">
          <FileTypeIcon path={node.path} />
        </span>
        <span className="changes-file-tree__row-label">{node.name}</span>
        <span className="changes-file-tree__row-stats">
          {node.additions > 0 && (
            <span className="changes-file-tree__stat-added">
              +{node.additions}
            </span>
          )}
          {node.deletions > 0 && (
            <span className="changes-file-tree__stat-removed">
              −{node.deletions}
            </span>
          )}
        </span>
        {hasDiscussions && (
          <span
            className="changes-file-tree__comment-icon"
            title="Есть комментарии"
            aria-hidden="true"
          >
            <Comment />
          </span>
        )}
        <FileStatusIcon status={node.status} />
      </button>
    );
  },
);
