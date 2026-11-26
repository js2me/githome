import {
  ArrowUturnCcwLeft,
  Check,
  CodePullRequestCheck,
  PencilToLine,
} from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import type { GitLabMergeRequestDC } from '@/shared/api/gitlab';
import type { MergeRequestApprovalView } from '@/shared/lib/gitlab/merge-request-approval-view';
import { type MessageKey, t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import { StatusMessage } from '@/shared/ui/status-message';
import type { MrAction, MrReviewAction } from '../../../model/mr-info';
import './mr-review-actions.css';
import { ApprovalSummary } from './approval-summary';
import { Reviewer } from './reviewer';

const actionButton =
  'inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] leading-tight font-semibold';

const actionLabels = {
  approve: {
    idle: 'review.approve',
    busy: 'review.approving',
  },
  unapprove: {
    idle: 'review.revokeApproval',
    busy: 'review.revoking',
  },
  requestChanges: {
    idle: 'review.requestChanges',
    busy: 'review.submitting',
  },
  cancelRequestChanges: {
    idle: 'review.withdrawChangeRequest',
    busy: 'review.revoking',
  },
} satisfies Record<MrReviewAction, { idle: MessageKey; busy: MessageKey }>;

export const MrReviewActions = observer(
  ({
    mergeRequest,
    approvals,
    reviewActionInProgress,
    reviewActionError,
    onApprove,
    onUnapprove,
    onRequestChanges,
    onCancelRequestChanges,
  }: {
    mergeRequest: GitLabMergeRequestDC;
    approvals: MergeRequestApprovalView;
    reviewActionInProgress: MrAction | null;
    reviewActionError: string | null;
    onApprove: () => void;
    onUnapprove: () => void;
    onRequestChanges: () => void;
    onCancelRequestChanges: () => void;
  }) => {
    if (
      mergeRequest.state !== 'opened' ||
      (mergeRequest.draft ?? mergeRequest.work_in_progress)
    )
      return null;

    const isBusy = reviewActionInProgress !== null;
    const userApproved = approvals.current_user_approved;
    const userRequestedChanges = approvals.current_user_requested_changes;
    const approvalAction = userApproved ? 'unapprove' : 'approve';
    const changesAction = userRequestedChanges
      ? 'cancelRequestChanges'
      : 'requestChanges';
    const ApprovalIcon = userApproved ? ArrowUturnCcwLeft : Check;
    const ChangesIcon = userRequestedChanges ? ArrowUturnCcwLeft : PencilToLine;
    const approvedIds = new Set(
      approvals.approved_by.map(({ user }) => user.id),
    );
    const reviewerIds = new Set(approvals.reviewers.map(({ user }) => user.id));
    const otherApprovers = approvals.approved_by.filter(
      ({ user }) => !reviewerIds.has(user.id),
    );

    return (
      <section
        className="glass-panel mr-review min-w-0 rounded-2xl"
        aria-label={t('review.review')}
      >
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--glass-selected)] text-[var(--glass-accent)]"
              aria-hidden
            >
              <CodePullRequestCheck className="size-[19px]" />
            </span>
            <div className="grid min-w-0 gap-1">
              <h3 className="font-semibold text-base leading-tight tracking-tight">
                {t('review.review')}
              </h3>
              <div aria-live="polite">
                <ApprovalSummary approvals={approvals} />
              </div>
            </div>
          </div>

          <div
            className="mr-review-actions flex flex-wrap items-center gap-2"
            role="group"
            aria-label={t('review.reviewActions')}
            aria-busy={isBusy}
          >
            {approvals.approvals_available && (
              <button
                type="button"
                className={`${actionButton} ${userApproved ? 'glass-control' : 'glass-primary'}`}
                disabled={isBusy}
                onClick={userApproved ? onUnapprove : onApprove}
              >
                <ApprovalIcon className="size-4 shrink-0" aria-hidden />
                {t(
                  actionLabels[approvalAction][
                    reviewActionInProgress === approvalAction ? 'busy' : 'idle'
                  ],
                )}
              </button>
            )}
            <button
              type="button"
              className={`${actionButton} glass-control`}
              disabled={isBusy}
              onClick={
                userRequestedChanges ? onCancelRequestChanges : onRequestChanges
              }
            >
              <ChangesIcon className="size-4 shrink-0" aria-hidden />
              {t(
                actionLabels[changesAction][
                  reviewActionInProgress === changesAction ? 'busy' : 'idle'
                ],
              )}
            </button>
          </div>
        </div>

        {reviewActionError && (
          <StatusMessage className="mx-4 mt-0 mb-3 sm:mx-5" error>
            {reviewActionError}
          </StatusMessage>
        )}

        {(approvals.reviewers.length > 0 ||
          approvals.approved_by.length > 0) && (
          <div className="mr-review-people grid gap-x-6 gap-y-3 border-[var(--glass-border)] border-t px-4 py-3 sm:px-5">
            {approvals.reviewers.length > 0 && (
              <div className="min-w-0">
                <h4 className="mb-2 font-semibold text-fg-muted text-xs">
                  {t('review.reviewers')}
                </h4>
                <ul className="flex flex-wrap gap-x-4 gap-y-2">
                  {approvals.reviewers.map((reviewer) => (
                    <Reviewer
                      key={reviewer.user.id}
                      reviewer={reviewer}
                      approved={approvedIds.has(reviewer.user.id)}
                    />
                  ))}
                </ul>
              </div>
            )}
            {otherApprovers.length > 0 && (
              <div className="min-w-0">
                <h4 className="mb-2 font-semibold text-fg-muted text-xs">
                  {t('review.approvedBy')}
                </h4>
                <ul className="flex flex-wrap gap-x-4 gap-y-2">
                  {otherApprovers.map(({ user }) => (
                    <li
                      key={user.id}
                      className="flex min-w-0 max-w-full items-center gap-2 font-medium text-[13px]"
                    >
                      <GitlabAvatar
                        className="size-6 shrink-0 rounded-full object-cover"
                        name={user.name}
                        avatarUrl={user.avatar_url}
                      />
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        {user.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    );
  },
);
