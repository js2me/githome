import { ChevronDown, CircleCheck, CodePullRequest } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import type { ReviewInbox as ReviewInboxModel } from '@/features/review-inbox';
import { t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import { InboxPageRows } from '../inbox-page-rows';

export const ReviewInbox = observer(
  ({ reviewInbox }: { reviewInbox: ReviewInboxModel }) => (
    <section
      className="home-panel home-review"
      aria-labelledby="home-reviews-title"
    >
      <header className="home-panel-header">
        <h2 id="home-reviews-title">
          <CodePullRequest className="size-4 text-fg-muted" aria-hidden />
          {t('common.mergeRequests')}
        </h2>
        <div
          className="home-review-tabs"
          role="group"
          aria-label={t('home.myMergeRequests')}
        >
          {(['reviewer', 'author'] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              aria-pressed={reviewInbox.scope === scope}
              className="home-scope"
              onClick={() => reviewInbox.setScope(scope)}
            >
              {scope === 'reviewer'
                ? t('home.forMyReview')
                : t('home.createdByMe')}
            </button>
          ))}
        </div>
      </header>

      {reviewInbox.isLoading && !reviewInbox.hasRequests && (
        <p className="home-empty-state" role="status">
          {t('home.loadingMergeRequests')}
        </p>
      )}
      {reviewInbox.hasRequests && (
        <ul className="home-inbox-list">
          {reviewInbox.pages.map((page) => (
            <InboxPageRows
              key={page.page}
              rows={page.items}
              onSelect={reviewInbox.openRequest}
            />
          ))}
        </ul>
      )}
      {reviewInbox.error ? (
        <StatusMessage className="m-4" error>
          {t('home.loadMergeRequestsFailed')}{' '}
          <button
            className="font-semibold underline"
            type="button"
            onClick={reviewInbox.retry}
          >
            {t('common.retry')}
          </button>
        </StatusMessage>
      ) : reviewInbox.resultQuery.hasNextPage ? (
        <div className="home-review-footer">
          <button
            type="button"
            className="glass-control inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs"
            disabled={reviewInbox.resultQuery.isFetching}
            onClick={reviewInbox.loadMore}
          >
            {reviewInbox.resultQuery.isFetchingNextPage
              ? t('common.loading')
              : t('home.showMore')}
            <ChevronDown className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      {!reviewInbox.isLoading &&
        !reviewInbox.error &&
        !reviewInbox.hasRequests && (
          <div className="home-empty-state" role="status">
            <CircleCheck
              className="mx-auto mb-3 size-6 text-[var(--color-success-fg)]"
              aria-hidden
            />
            {reviewInbox.filter.trim()
              ? t('workbench.noMatchingRequests')
              : reviewInbox.scope === 'reviewer'
                ? t('home.noMergeRequestsAreAssignedToYou')
                : t('home.youHaveNoOpenMergeRequestsYet')}
          </div>
        )}
    </section>
  ),
);
