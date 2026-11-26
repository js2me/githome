import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { observer } from 'mobx-react-lite';
import { useLayoutEffect } from 'react';
import {
  codeFontSizeKey,
  wrapSourceCodeKey,
} from '@/shared/lib/code-view-preferences';
import type { FileGitDiff } from '../../model/file-git-diff';
import { getDiffRowLayoutClassName } from './diff-row-layout';
import { VirtualDiffRowView } from './virtual-diff-row-view';

export const VirtualizedDiffBody = observer(
  ({ file }: { file: FileGitDiff }) => {
    const { navigation } = file;
    const rows = file.rows.virtualRows;
    const fontSize = codeFontSizeKey.value;
    const wrap = wrapSourceCodeKey.value;
    const lineHeight = fontSize * 1.6;
    const virtualizer = useWindowVirtualizer({
      count: rows.length,
      estimateSize: (index) => {
        const row = rows[index];
        if (!row || row.type === 'line') return lineHeight;
        return row.estimatedHeight;
      },
      getItemKey: (index) => rows[index]?.id ?? index,
      overscan: 24,
      scrollMargin: navigation.scrollMargin,
      measureElement: (element) => element.getBoundingClientRect().height,
    });

    const measureKey = file.rows.layoutKey;
    useLayoutEffect(() => {
      navigation.measureMargin();
      virtualizer.measure();
      for (const element of navigation.listRef.current?.querySelectorAll<HTMLElement>(
        ':scope > div > [data-index]',
      ) ?? []) {
        virtualizer.measureElement(element);
      }
    }, [fontSize, wrap, measureKey, navigation, virtualizer]);

    useLayoutEffect(() => {
      return navigation.registerScrollToRow((rowId: string) => {
        const index = rows.findIndex((row) => row.id === rowId);
        if (index >= 0) {
          virtualizer.scrollToIndex(index, { align: 'center' });
        }
      });
    }, [navigation, rows, virtualizer]);

    return (
      <div ref={navigation.listRef} className="diff-viewport w-full pl-7">
        <div
          className="relative w-full"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];

            return (
              <div
                key={row.id}
                data-index={virtualRow.index}
                data-diff-row-id={row.id}
                ref={virtualizer.measureElement}
                className={getDiffRowLayoutClassName(row)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start - navigation.scrollMargin}px)`,
                }}
              >
                <VirtualDiffRowView row={row} file={file} />
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
