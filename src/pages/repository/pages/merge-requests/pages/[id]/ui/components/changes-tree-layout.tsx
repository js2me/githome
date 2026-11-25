import { observer } from 'mobx-react-lite';
import type { ReactElement, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import type { MergeRequestDetailVM } from '../../model/merge-request-detail';

export const ChangesTreeLayout = observer(
  ({
    model,
    overview,
    tree,
    connector,
    children,
  }: {
    model: MergeRequestDetailVM;
    overview: ReactNode;
    tree: ReactElement | null;
    connector: ReactNode;
    children: ReactNode;
  }) => {
    const { width, handleResizePointerDown } = model;

    return (
      <div
        className={cn(
          'changes-tree-layout grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-4',
          tree && 'lg:grid-cols-[auto_minmax(0,1fr)]',
        )}
      >
        <div
          className={cn(
            'relative z-20 min-w-0',
            tree && 'lg:col-start-2 lg:row-start-1',
          )}
        >
          {overview}
        </div>
        {tree && (
          <div
            className="changes-tree-layout__sidebar relative z-10 w-full self-stretch lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:w-auto"
            style={{ width }}
          >
            <div className="changes-tree-layout__sticky relative lg:sticky lg:top-4">
              {tree}
              <div
                role="separator"
                aria-orientation="vertical"
                aria-valuenow={width}
                aria-label="Изменить ширину дерева файлов"
                className={cn(
                  'changes-tree-layout__resize-handle absolute top-0 -right-2 z-10 h-full w-4 cursor-col-resize touch-none select-none',
                  'after:absolute after:top-0 after:left-1/2 after:h-full after:w-px after:-translate-x-1/2 after:bg-[var(--file-tree-border)]',
                  'hover:after:w-0.5 hover:after:bg-accent-blue',
                )}
                onPointerDown={handleResizePointerDown}
              />
            </div>
          </div>
        )}

        {connector}

        <div className="relative z-20 flex min-w-0 flex-col gap-5">
          {children}
        </div>
      </div>
    );
  },
);
