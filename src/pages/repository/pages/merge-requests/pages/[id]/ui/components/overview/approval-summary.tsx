import { observer } from 'mobx-react-lite';
import type { MergeRequestApprovalView } from '@/shared/lib/gitlab/merge-request-approval-view';
import { t } from '@/shared/lib/i18n';

export const ApprovalSummary = observer(
  ({ approvals }: { approvals: MergeRequestApprovalView }) => {
    if (!approvals.approvals_available) {
      return (
        <p className="text-fg-muted text-xs">
          {t('review.approvalsAreUnavailableOnThisGitlabServer')}
        </p>
      );
    }

    const required = approvals.approvals_required;
    const approvedCount = approvals.approved_by.length;
    if (required === 0)
      return (
        <p className="text-fg-muted text-xs">
          {t('review.noApprovalsRequired')}
        </p>
      );
    if (required === null)
      return (
        <p className="text-fg-muted text-xs">
          {approvedCount ? (
            <>
              {t('review.approvalsReceived')} <strong>{approvedCount}</strong>
            </>
          ) : (
            t('review.noApprovalsYet')
          )}
        </p>
      );

    const completed = Math.max(
      0,
      Math.min(
        required,
        approvals.approvals_left === null
          ? approvedCount
          : required - approvals.approvals_left,
      ),
    );

    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-fg-muted text-xs">
        <span>
          {t('review.approvals2')}{' '}
          <strong className="font-semibold text-fg-default">
            {t('review.approvalProgress', { approved: completed, required })}
          </strong>
        </span>
        <progress
          className="mr-review-progress"
          aria-label={t('review.requiredApprovals')}
          data-complete={completed === required}
          max={required}
          value={completed}
        />
      </div>
    );
  },
);
