import { Comment, Magnifier } from '@gravity-ui/icons';
import { useVirtualizer } from '@tanstack/react-virtual';
import { withPropsViewModel } from 'mobx-view-model-react';
import { type CSSProperties, memo, useCallback, useLayoutEffect } from 'react';
import type { ChangesTreeNode } from '@/shared/lib/build-changes-tree';
import { cn } from '@/shared/lib/cn';
import { getChangesTreeFileDataId } from '@/shared/lib/diff-search';
import { FileTypeIcon } from '@/shared/ui/file-type-icon';
import { ChangesFileTreeVM } from '../../model/changes-file-tree';
import { FileStatusIcon } from './changes/file-tree/file-status-icon';
import './changes-file-tree.css';

const FILE_ROW_HEIGHT = 32;

const TreeNodeView = memo(
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

export const ChangesFileTree = withPropsViewModel(
  ChangesFileTreeVM,
  ({ model }) => {
    const {
      rows,
      nav,
      activeIndex,
      collapsedPaths,
      searchQuery,
      fileKeysWithDiscussions,
    } = model;
    const { changes, onSelectFile } = model.payload;
    const activeFileKey = model.payload.activeFile.get();
    const getItemKey = useCallback((index: number) => rows[index].key, [rows]);
    const virtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => nav.current,
      estimateSize: () => FILE_ROW_HEIGHT,
      getItemKey,
      paddingStart: 4,
      paddingEnd: 4,
      overscan: 8,
    });

    useLayoutEffect(() => {
      if (activeIndex >= 0)
        virtualizer.scrollToIndex(activeIndex, { align: 'auto' });
    }, [activeIndex, activeFileKey, virtualizer]);

    if (changes.length === 0) {
      return null;
    }

    return (
      <aside
        className="changes-file-tree flex max-h-[calc(100vh-2rem)] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--file-tree-border)] bg-[var(--file-tree-bg)]"
        style={{ '--file-row-height': `${FILE_ROW_HEIGHT}px` } as CSSProperties}
      >
        <div className="changes-file-tree__header">
          <span>Files</span>
          <span className="changes-file-tree__count">{changes.length}</span>
        </div>

        <label className="changes-file-tree__search">
          <Magnifier width={16} height={16} />
          <input
            className="changes-file-tree__search-input"
            placeholder="Search (e.g. *.vue)"
            type="search"
            value={searchQuery}
            onChange={(event) => model.search(event.target.value)}
          />
        </label>

        <nav ref={nav} className="changes-file-tree__nav">
          <div
            className="relative"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const { node, depth } = rows[item.index];
              return (
                <div
                  key={item.key}
                  className="absolute inset-x-0 top-0"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <TreeNodeView
                    node={node}
                    depth={depth}
                    expanded={!collapsedPaths.has(node.path)}
                    isActive={item.index === activeIndex}
                    hasDiscussions={
                      node.type === 'file' &&
                      fileKeysWithDiscussions.has(node.id)
                    }
                    onToggleFolder={model.toggleFolder}
                    onSelectFile={onSelectFile}
                  />
                </div>
              );
            })}
          </div>
        </nav>
      </aside>
    );
  },
);
