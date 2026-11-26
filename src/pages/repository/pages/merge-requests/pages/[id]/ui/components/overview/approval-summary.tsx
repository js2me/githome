import type { MergeRequestApprovalView } from '@/shared/lib/gitlab/merge-request-approval-view';

export const ApprovalSummary = ({
  approvals,
}: {
  approvals: MergeRequestApprovalView;
}) => {
  if (!approvals.approvals_available) {
    return (
      <p className="text-fg-muted text-xs">
        Одобрения недоступны на этом сервере GitLab
      </p>
    );
  }

  const required = approvals.approvals_required;
  const approvedCount = approvals.approved_by.length;
  if (required === 0)
    return <p className="text-fg-muted text-xs">Обязательных одобрений нет</p>;
  if (required === null)
    return (
      <p className="text-fg-muted text-xs">
        {approvedCount ? (
          <>
            Одобрений получено <strong>{approvedCount}</strong>
          </>
        ) : (
          'Одобрений пока нет'
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
        Одобрения{' '}
        <strong className="font-semibold text-fg-default">
          {completed} из {required}
        </strong>
      </span>
      <progress
        className="mr-review-progress"
        aria-label="Обязательные одобрения"
        data-complete={completed === required}
        max={required}
        value={completed}
      />
    </div>
  );
};
