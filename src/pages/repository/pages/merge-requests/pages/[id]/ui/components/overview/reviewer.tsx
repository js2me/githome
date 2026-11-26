import { Check } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import type { GitLabMergeRequestReviewerDC } from '@/shared/api/gitlab';
import { type MessageKey, t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';

const reviewerStates: Record<string, { labelKey: MessageKey; tone?: string }> =
  {
    reviewed: {
      labelKey: 'review.reviewComplete',
      tone: 'success',
    },
    approved: {
      labelKey: 'review.approved2',
      tone: 'success',
    },
    requested_changes: {
      labelKey: 'review.changesRequested2',
      tone: 'changes',
    },
    reviewing: {
      labelKey: 'review.reviewInProgress',
      tone: 'active',
    },
    review_started: {
      labelKey: 'review.reviewInProgress',
      tone: 'active',
    },
    unapproved: {
      labelKey: 'review.approvalRevoked',
    },
    unreviewed: {
      labelKey: 'review.awaitingReview',
    },
  };

export const Reviewer = observer(
  ({
    reviewer,
    approved,
  }: {
    reviewer: GitLabMergeRequestReviewerDC;
    approved: boolean;
  }) => {
    const requestedChanges = reviewer.state === 'requested_changes';
    const status = approved && !requestedChanges ? 'approved' : reviewer.state;
    const state = reviewerStates[status];
    return (
      <li className="flex min-w-0 max-w-full items-center gap-2">
        <GitlabAvatar
          className="size-7 shrink-0 rounded-full object-cover"
          name={reviewer.user.name}
          avatarUrl={reviewer.user.avatar_url}
        />
        <span className="grid min-w-0 gap-0.5">
          <span className="font-medium text-[13px] leading-tight [overflow-wrap:anywhere]">
            {reviewer.user.name}
          </span>
          <span className="flex flex-wrap gap-x-2 gap-y-1 text-xs leading-tight">
            <span
              className="mr-review-state inline-flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]"
              data-tone={state?.tone}
            >
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-current"
              />
              {state ? t(state.labelKey) : status}
            </span>
            {approved && requestedChanges && (
              <span
                className="mr-review-state inline-flex items-center gap-1"
                data-tone="success"
              >
                <Check className="size-3" aria-hidden /> {t('review.approved2')}
              </span>
            )}
          </span>
        </span>
      </li>
    );
  },
);
