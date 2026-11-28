import { CodePullRequest, Magnifier, Xmark } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { MrStateBadge, RequestRow } from '@/entities/gitlab-merge-requests';
import type { ForgePullRequestFilter } from '@/shared/api/forge/contracts';
import { type MessageKey, t } from '@/shared/lib/i18n';
import type { GithubRepositoryModel } from '../../model/github/repository';
import { ForgeLoadMore } from '../load-more';
import { ForgeQueryStatus } from '../query-status';
import { GithubTabs } from './tabs';

const filters: [ForgePullRequestFilter, MessageKey][] = [
  ['opened', 'review.open2'],
  ['mine', 'review.mine'],
  ['merged', 'review.merged2'],
  ['closed', 'review.closed2'],
];

export const GithubPullRequestList = observer(
  ({ model }: { model: GithubRepositoryModel }) => {
    const { pullRequests, filter, search, account } = model;
    const items = pullRequests.data?.pages.flatMap(({ items }) => items);
    return (
      <section className="w-full min-w-0" aria-labelledby="github-pr-heading">
        <h2
          id="github-pr-heading"
          className="mb-5 flex items-center gap-3 font-semibold text-2xl tracking-tight sm:text-[30px]"
        >
          <span
            className="grid size-8 shrink-0 place-items-center rounded-md bg-[var(--glass-selected)] text-[var(--glass-accent)]"
            aria-hidden
          >
            <CodePullRequest width={21} height={21} />
          </span>
          {t('forge.pullRequests')}
        </h2>
        <div className="glass-panel overflow-hidden rounded-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-[var(--glass-border)] border-b p-3 sm:p-4">
            <GithubTabs
              label={t('review.mergeRequestFilters')}
              tabs={filters.map(([id, key]) => ({
                label: t(key),
                active: id === filter,
                onSelect: () => model.setFilter(id),
              }))}
            />
            <form
              role="search"
              className="relative flex w-full items-center sm:w-72"
              onSubmit={(event) => {
                event.preventDefault();
                model.setSearch(
                  String(new FormData(event.currentTarget).get('q') ?? ''),
                );
              }}
            >
              <Magnifier
                width={16}
                height={16}
                className="pointer-events-none absolute left-3 text-fg-muted"
                aria-hidden
              />
              <input
                key={search}
                className="glass-input h-10 w-full rounded-md pr-10 pl-9 text-sm"
                name="q"
                type="text"
                inputMode="search"
                defaultValue={search}
                aria-label={t('review.titleOrNumber')}
                placeholder={t('review.titleOrNumber')}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => model.setSearch('')}
                  aria-label={t('review.clearSearch')}
                  className="absolute right-1 grid size-8 cursor-pointer place-items-center rounded-lg text-fg-muted hover:bg-[var(--glass-hover)] hover:text-fg-default"
                >
                  <Xmark width={14} height={14} aria-hidden />
                </button>
              )}
            </form>
          </div>
          {filter === 'mine' && <ForgeQueryStatus query={account} />}
          <ForgeQueryStatus query={pullRequests} />
          {items?.length === 0 && !pullRequests.hasNextPage && (
            <div
              role="status"
              className="grid justify-items-center gap-3 px-5 py-12 text-center"
            >
              <span
                className="grid size-11 place-items-center rounded-md bg-[var(--glass-control)] text-fg-muted"
                aria-hidden
              >
                {search ? <Magnifier /> : <CodePullRequest />}
              </span>
              <p className="font-semibold text-sm">
                {t(
                  filter === 'opened' && !search
                    ? 'forge.noPullRequests'
                    : 'forge.noMatchingPullRequests',
                )}
              </p>
            </div>
          )}
          <ul className="m-0 list-none divide-y divide-[var(--glass-border)] p-0">
            {items?.map((pr) => (
              <RequestRow
                key={pr.number}
                statusId={`pr-list-status-${pr.number}`}
                label={`#${pr.number} ${pr.title}`}
                number={`#${pr.number}`}
                title={pr.title}
                authorName={pr.author?.name ?? t('review.unknownAuthor')}
                avatarUrl={pr.author?.avatarUrl}
                updatedAt={pr.updatedAt}
                sourceBranch={pr.sourceBranch}
                targetBranch={pr.targetBranch}
                status={
                  <MrStateBadge
                    mergeRequest={{
                      state: pr.state === 'open' ? 'opened' : pr.state,
                      draft: pr.draft,
                    }}
                  />
                }
                onSelect={() => model.parent.openPullRequest(pr.number)}
              />
            ))}
          </ul>
          {pullRequests.hasNextPage && (
            <div className="px-4 pb-4">
              <ForgeLoadMore query={pullRequests} />
            </div>
          )}
        </div>
      </section>
    );
  },
);
