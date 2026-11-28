import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import { GitDiff } from '@/shared/ui/git-diff';
import { StatusMessage } from '@/shared/ui/status-message';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';

const ignore = () => {};
const rejectComment = async () => false;

export const MrCommitDiff = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const {
      commits,
      parentViewModel: { mrInfo: info },
    } = model;
    const { selected, diffQuery, changes } = commits;
    if (commits.query.isLoading || diffQuery.isLoading)
      return <StatusMessage>{t('review.preparingDiff')}</StatusMessage>;
    if (!selected) {
      return (
        <div className="grid justify-items-start gap-2">
          <StatusMessage error>
            {commits.query.error?.message ?? t('workbench.commitUnavailable')}
          </StatusMessage>
          {commits.query.hasNextPage && (
            <button
              type="button"
              className="glass-control rounded-md px-2 py-1 text-xs"
              onClick={commits.loadMore}
            >
              {t('home.showMore')}
            </button>
          )}
        </div>
      );
    }
    return (
      <>
        <header className="mr-commit-header">
          <h2>{selected.title}</h2>
          <div className="text-fg-muted text-xs">
            {selected.author_name} · <code>{selected.short_id}</code>
          </div>
        </header>
        {diffQuery.error && (
          <StatusMessage error>{diffQuery.error.message}</StatusMessage>
        )}
        {(changes.length > 0 || !diffQuery.error) && (
          <GitDiff
            key={selected.id}
            changes={changes}
            discussions={[]}
            canComment={false}
            isSubmittingComment={false}
            submitCommentError={null}
            onAddComment={rejectComment}
            onClearSubmitError={ignore}
            headRef={selected.id}
            baseRef={selected.parent_ids?.[0] ?? null}
            loadFileContent={info.loadDiffFileContent}
            loadFileImage={info.gitDiff.loadFileImage}
            markdownScope={model.markdownScope}
          />
        )}
        {diffQuery.hasNextPage && (
          <button
            type="button"
            className="glass-control rounded-md px-2 py-1 text-xs"
            onClick={commits.loadMoreDiffs}
            disabled={diffQuery.isFetching}
          >
            {t('home.showMore')}
          </button>
        )}
      </>
    );
  },
);
