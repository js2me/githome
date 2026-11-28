import { CodeCommits } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { getLocale, t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import type { MrCommits } from '../../../../model/changes/mr-commits';

export const MrCommitList = observer(
  ({
    model,
    onSelect,
  }: {
    model: MrCommits;
    onSelect: (id: string) => void;
  }) => (
    <div className="mr-commit-list">
      {model.query.isLoading && (
        <StatusMessage>{t('common.loading')}</StatusMessage>
      )}
      {model.query.error && (
        <StatusMessage error>
          {model.query.error.message}{' '}
          <button
            type="button"
            className="cursor-pointer underline"
            onClick={() => void model.query.refetch()}
          >
            {t('common.retry')}
          </button>
        </StatusMessage>
      )}
      {!model.query.isLoading && !model.query.error && !model.items.length && (
        <p className="mr-pane-message">{t('workbench.noCommits')}</p>
      )}
      {model.items.length > 0 && (
        <ul>
          {model.items.map((commit) => (
            <li key={commit.id}>
              <button
                className="mr-commit-row"
                type="button"
                aria-current={
                  model.selectedId === commit.id ? 'true' : undefined
                }
                onClick={() => onSelect(commit.id)}
              >
                <CodeCommits
                  className="size-4 shrink-0 text-fg-muted"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <strong className="block break-words font-medium">
                    {commit.title}
                  </strong>
                  <span className="mt-0.5 flex flex-wrap gap-x-2 text-fg-muted text-xs">
                    <span>{commit.author_name}</span>
                    {commit.committed_date && (
                      <time dateTime={commit.committed_date}>
                        {new Intl.DateTimeFormat(getLocale(), {
                          dateStyle: 'medium',
                        }).format(new Date(commit.committed_date))}
                      </time>
                    )}
                    <code>{commit.short_id}</code>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {model.query.hasNextPage && (
        <button
          type="button"
          className="glass-control m-1 rounded-md px-2 py-1 text-xs"
          onClick={model.loadMore}
          disabled={model.query.isFetching}
        >
          {t('home.showMore')}
        </button>
      )}
    </div>
  ),
);
