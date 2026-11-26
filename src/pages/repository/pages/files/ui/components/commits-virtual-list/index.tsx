import { useVirtualizer } from '@tanstack/react-virtual';
import { observer } from 'mobx-react-lite';
import type { GitLabCommitDC } from '@/shared/api/gitlab';
import type { RepositoryCommitsModel } from '../../../model/repository-commits';
import { CommitRow } from './commit-row';

const COMMIT_ROW_HEIGHT = 56;

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
