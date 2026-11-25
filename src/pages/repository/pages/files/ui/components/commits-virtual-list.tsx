import { useVirtualizer } from '@tanstack/react-virtual';
import { observer } from 'mobx-react-lite';
import type { GitLabCommitDC } from '@/shared/api/gitlab';
import { cn } from '@/shared/lib/cn';
import type { RepositoryCommitsModel } from '../../model/repository-commits';

const COMMIT_ROW_HEIGHT = 56;

const formatCommitDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const CommitRow = ({
  commit,
  isSelected,
  isHead,
  onSelect,
}: {
  commit: GitLabCommitDC;
  isSelected: boolean;
  isHead: boolean;
  onSelect: () => void;
}) => (
  <button
    className={cn(
      'flex w-full flex-col gap-0.5 border-none bg-transparent px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800',
      isSelected &&
        'bg-orange-50 hover:bg-orange-50 dark:bg-orange-950 dark:hover:bg-orange-950',
    )}
    type="button"
    role="option"
    aria-selected={isSelected}
    onClick={onSelect}
  >
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          'shrink-0 font-mono text-xs',
          isSelected
            ? 'font-semibold text-orange-700 dark:text-orange-300'
            : 'text-slate-600 dark:text-slate-400',
        )}
      >
        {commit.short_id}
      </span>
      {isHead && (
        <span className="shrink-0 font-normal text-slate-400 text-xs">
          HEAD
        </span>
      )}
      <span
        className={cn(
          'min-w-0 truncate text-sm',
          isSelected
            ? 'font-semibold text-orange-700 dark:text-orange-300'
            : 'text-slate-800 dark:text-slate-200',
        )}
      >
        {commit.title}
      </span>
    </span>
    <span className="truncate text-slate-500 text-xs">
      {commit.author_name} · {formatCommitDate(commit.committed_date)}
    </span>
  </button>
);

const CommitsVirtualList = observer(
  ({
    commitsModel,
    onSelect,
  }: {
    commitsModel: RepositoryCommitsModel;
    onSelect: (commit: GitLabCommitDC) => void;
  }) => {
    const parentRef = commitsModel.listContainer;
    const commits = commitsModel.commits;

    const virtualizer = useVirtualizer({
      count: commits.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => COMMIT_ROW_HEIGHT,
      overscan: 8,
      onChange: (list) =>
        commitsModel.updateVisibleRange(list.getVirtualItems().at(-1)?.index),
    });

    const virtualItems = virtualizer.getVirtualItems();
    return (
      <div ref={parentRef} className="max-h-64 overflow-y-auto" role="listbox">
        <div
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualItems.map((virtualRow) => {
            const commit = commits[virtualRow.index];
            if (!commit) {
              return null;
            }

            return (
              <div
                key={commit.id}
                className="absolute top-0 left-0 w-full"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <CommitRow
                  commit={commit}
                  isHead={virtualRow.index === 0}
                  isSelected={commitsModel.isCommitSelected(commit)}
                  onSelect={() => onSelect(commit)}
                />
              </div>
            );
          })}
        </div>

        {commitsModel.isFetchingNextPage && (
          <p className="px-3 py-2 text-slate-500 text-sm">Загружаем ещё...</p>
        )}
      </div>
    );
  },
);

export { CommitsVirtualList };
