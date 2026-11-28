import { observer } from 'mobx-react-lite';
import type { GithubReviewEvent } from '@/shared/api/github/workspace/review';
import { type MessageKey, t } from '@/shared/lib/i18n';
import type { GithubReviewModel } from '../../model/github/review';
import { ForgeQueryStatus } from '../query-status';

const labels = {
  APPROVED: 'review.approved',
  CHANGES_REQUESTED: 'review.changesRequested',
  COMMENTED: 'review.comments',
  DISMISSED: 'forge.reviewDismissed',
  PENDING: 'forge.submitReview',
} satisfies Record<string, MessageKey>;

const actions: { event: GithubReviewEvent; text: MessageKey }[] = [
  { event: 'APPROVE', text: 'review.approve' },
  { event: 'REQUEST_CHANGES', text: 'review.requestChanges' },
  { event: 'COMMENT', text: 'forge.submitReview' },
];

export const GithubReviewActions = observer(
  ({ model }: { model: GithubReviewModel }) => (
    <section className="glass-panel grid min-w-0 gap-3 rounded-lg p-4">
      <h2 className="font-semibold text-lg">{t('forge.reviews')}</h2>
      <ForgeQueryStatus query={model.reviews} />
      {model.reviews.data && model.reviewHistory.length === 0 && (
        <p className="text-fg-muted text-sm">{t('forge.noReviews')}</p>
      )}
      <ul className="grid gap-2">
        {model.reviewHistory.map((review) => (
          <li
            className="min-w-0 border-[var(--glass-border)] border-b pb-2"
            key={review.id}
          >
            <p className="break-words font-semibold text-sm">
              {review.user?.name || review.user?.login}{' '}
              <span className="text-fg-muted">· {t(labels[review.state])}</span>
            </p>
            {review.body && (
              <p className="whitespace-pre-wrap break-words text-sm">
                {review.body}
              </p>
            )}
          </li>
        ))}
      </ul>
      {model.canComment && (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const button = (event.nativeEvent as SubmitEvent).submitter;
            const action = actions.find(
              ({ event }) => event === button?.getAttribute('value'),
            );
            if (action) void model.submitReview(action.event);
          }}
        >
          <label className="grid gap-2 text-sm">
            {t('forge.reviewSummary')}
            <textarea
              className="glass-input w-full rounded-lg p-3"
              disabled={model.pending !== null}
              rows={3}
              value={model.reviewDraft}
              onChange={(event) => model.setReviewDraft(event.target.value)}
            />
          </label>
          {model.reviewError && (
            <p role="alert" className="text-sm">
              {model.reviewError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {actions.map(
              ({ event, text }) =>
                (event === 'COMMENT' || !model.isOwnPullRequest) && (
                  <button
                    key={event}
                    type="submit"
                    value={event}
                    className={`${event === 'APPROVE' ? 'glass-primary' : 'glass-control'} rounded-lg px-3 py-2 text-sm disabled:opacity-60`}
                    disabled={
                      model.pending !== null ||
                      (event !== 'APPROVE' && !model.reviewDraft.trim())
                    }
                  >
                    {t(text)}
                  </button>
                ),
            )}
          </div>
        </form>
      )}
    </section>
  ),
);
