import { Magnifier } from '@gravity-ui/icons';
import { useVirtualizer } from '@tanstack/react-virtual';
import { withPropsViewModel } from 'mobx-view-model-react';
import type { CSSProperties } from 'react';
import { t } from '@/shared/lib/i18n';
import { ChangesFileTreeVM } from './model';
import './styles.css';
import { TreeNodeView } from './nodes/tree-node-view';

const FILE_ROW_HEIGHT = 32;

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
      getItemKey,
    } = model;
    const { changes, onSelectFile, headerAction } = model.payload;
    const virtualizer = useVirtualizer<HTMLElement, HTMLDivElement>({
      count: rows.length,
      getScrollElement: () => nav.current,
      estimateSize: () => FILE_ROW_HEIGHT,
      getItemKey,
      paddingStart: 4,
      paddingEnd: 4,
      overscan: 8,
    });

    if (changes.length === 0) {
      return null;
    }

    return (
      <aside
        className="changes-file-tree flex max-h-[calc(100vh-2rem)] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--file-tree-border)] bg-[var(--file-tree-bg)]"
        style={{ '--file-row-height': `${FILE_ROW_HEIGHT}px` } as CSSProperties}
      >
        <div className="changes-file-tree__header">
          <span>{t('common.files')}</span>
          <span className="changes-file-tree__count">{changes.length}</span>
          {headerAction}
        </div>

        <label className="changes-file-tree__search">
          <Magnifier width={16} height={16} />
          <input
            className="changes-file-tree__search-input"
            placeholder={t('review.searchEGVue')}
            type="search"
            value={searchQuery}
            onChange={(event) => model.search(event.target.value)}
          />
        </label>

        <nav
          ref={model.getNavRef(virtualizer)}
          className="changes-file-tree__nav"
        >
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
