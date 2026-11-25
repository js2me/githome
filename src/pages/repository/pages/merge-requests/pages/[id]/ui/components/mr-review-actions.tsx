import {
  ArrowUturnCcwLeft,
  Check,
  CodePullRequestCheck,
  PencilToLine,
} from "@gravity-ui/icons";
import type {
  GitLabMergeRequestDC,
  GitLabMergeRequestReviewerDC,
} from "@/shared/api/gitlab";
import type { MergeRequestApprovalView } from "@/shared/lib/gitlab/merge-request-approval-view";
import { GitlabAvatar } from "@/shared/ui/gitlab-avatar";
import { StatusMessage } from "@/shared/ui/status-message";
import type { MrReviewAction } from "../../model/mr-info";
import "./mr-review-actions.css";

const reviewerStates: Record<string, { label: string; tone?: string }> = {
  reviewed: { label: "Ревью завершено", tone: "success" },
  approved: { label: "Одобрено", tone: "success" },
  requested_changes: { label: "Запрошены правки", tone: "changes" },
  reviewing: { label: "Ревью в процессе", tone: "active" },
  review_started: { label: "Ревью в процессе", tone: "active" },
  unapproved: { label: "Одобрение отозвано" },
  unreviewed: { label: "Ожидает ревью" },
};

const Reviewer = ({ reviewer, approved }: { reviewer: GitLabMergeRequestReviewerDC; approved: boolean }) => {
  const requestedChanges = reviewer.state === "requested_changes";
  const status = approved && !requestedChanges ? "approved" : reviewer.state;
  const state = reviewerStates[status] ?? { label: status };
  return (
    <li className="flex min-w-0 max-w-full items-center gap-2">
      <GitlabAvatar className="size-7 shrink-0 rounded-full object-cover" name={reviewer.user.name} avatarUrl={reviewer.user.avatar_url} />
      <span className="grid min-w-0 gap-0.5">
        <span className="text-[13px] leading-tight font-medium [overflow-wrap:anywhere]">{reviewer.user.name}</span>
        <span className="flex flex-wrap gap-x-2 gap-y-1 text-xs leading-tight">
          <span className="mr-review-state inline-flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]" data-tone={state.tone}>
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
            {state.label}
          </span>
          {approved && requestedChanges && (
            <span className="mr-review-state inline-flex items-center gap-1" data-tone="success">
              <Check className="size-3" aria-hidden /> Одобрено
            </span>
          )}
        </span>
      </span>
    </li>
  );
};

const ApprovalSummary = ({ approvals }: { approvals: MergeRequestApprovalView }) => {
  if (!approvals.approvals_available) {
    return <p className="text-xs text-fg-muted">Одобрения недоступны на этом сервере GitLab</p>;
  }

  const required = approvals.approvals_required;
  const approvedCount = approvals.approved_by.length;
  if (required === 0) return <p className="text-xs text-fg-muted">Обязательных одобрений нет</p>;
  if (required === null) return (
    <p className="text-xs text-fg-muted">
      {approvedCount ? <>Одобрений получено <strong>{approvedCount}</strong></> : "Одобрений пока нет"}
    </p>
  );

  const completed = Math.max(0, Math.min(required, approvals.approvals_left === null
    ? approvedCount
    : required - approvals.approvals_left));

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
      <span>Одобрения <strong className="font-semibold text-fg-default">{completed} из {required}</strong></span>
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

const actionButton = "inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] leading-tight font-semibold";
const actionLabels = {
  approve: { idle: "Одобрить", busy: "Одобряем…" },
  unapprove: { idle: "Отозвать одобрение", busy: "Отзываем…" },
  requestChanges: { idle: "Запросить правки", busy: "Отправляем…" },
  cancelRequestChanges: { idle: "Отозвать запрос правок", busy: "Отзываем…" },
} satisfies Record<MrReviewAction, { idle: string; busy: string }>;

export const MrReviewActions = ({
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
  reviewActionInProgress: MrReviewAction | null;
  reviewActionError: string | null;
  onApprove: () => void;
  onUnapprove: () => void;
  onRequestChanges: () => void;
  onCancelRequestChanges: () => void;
}) => {
  if (mergeRequest.state !== "opened" || (mergeRequest.draft ?? mergeRequest.work_in_progress)) return null;

  const isBusy = reviewActionInProgress !== null;
  const userApproved = approvals.current_user_approved;
  const userRequestedChanges = approvals.current_user_requested_changes;
  const approvalAction = userApproved ? "unapprove" : "approve";
  const changesAction = userRequestedChanges ? "cancelRequestChanges" : "requestChanges";
  const ApprovalIcon = userApproved ? ArrowUturnCcwLeft : Check;
  const ChangesIcon = userRequestedChanges ? ArrowUturnCcwLeft : PencilToLine;
  const approvedIds = new Set(approvals.approved_by.map(({ user }) => user.id));
  const reviewerIds = new Set(approvals.reviewers.map(({ user }) => user.id));
  const otherApprovers = approvals.approved_by.filter(({ user }) => !reviewerIds.has(user.id));

  return (
    <section className="mr-review glass-panel min-w-0 rounded-2xl" aria-label="Ревью">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--glass-selected)] text-[var(--glass-accent)]" aria-hidden>
            <CodePullRequestCheck className="size-[19px]" />
          </span>
          <div className="grid min-w-0 gap-1">
            <h3 className="text-base leading-tight font-semibold tracking-tight">Ревью</h3>
            <div aria-live="polite"><ApprovalSummary approvals={approvals} /></div>
          </div>
        </div>

        <div className="mr-review-actions flex flex-wrap items-center gap-2" role="group" aria-label="Действия ревью" aria-busy={isBusy}>
          {approvals.approvals_available && (
            <button
              type="button"
              className={`${actionButton} ${userApproved ? "glass-control" : "glass-primary"}`}
              disabled={isBusy}
              onClick={userApproved ? onUnapprove : onApprove}
            >
              <ApprovalIcon className="size-4 shrink-0" aria-hidden />
              {actionLabels[approvalAction][reviewActionInProgress === approvalAction ? "busy" : "idle"]}
            </button>
          )}
          <button
            type="button"
            className={`${actionButton} glass-control`}
            disabled={isBusy}
            onClick={userRequestedChanges ? onCancelRequestChanges : onRequestChanges}
          >
            <ChangesIcon className="size-4 shrink-0" aria-hidden />
            {actionLabels[changesAction][reviewActionInProgress === changesAction ? "busy" : "idle"]}
          </button>
        </div>
      </div>

      {reviewActionError && <StatusMessage className="mx-4 mt-0 mb-3 sm:mx-5" error>{reviewActionError}</StatusMessage>}

      {(approvals.reviewers.length > 0 || approvals.approved_by.length > 0) && (
        <div className="mr-review-people grid gap-x-6 gap-y-3 border-t border-[var(--glass-border)] px-4 py-3 sm:px-5">
          {approvals.reviewers.length > 0 && (
            <div className="min-w-0">
              <h4 className="mb-2 text-xs font-semibold text-fg-muted">Ревьюеры</h4>
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {approvals.reviewers.map(reviewer => (
                  <Reviewer key={reviewer.user.id} reviewer={reviewer} approved={approvedIds.has(reviewer.user.id)} />
                ))}
              </ul>
            </div>
          )}
          {otherApprovers.length > 0 && (
            <div className="min-w-0">
              <h4 className="mb-2 text-xs font-semibold text-fg-muted">Одобрили</h4>
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {otherApprovers.map(({ user }) => (
                  <li key={user.id} className="flex min-w-0 max-w-full items-center gap-2 text-[13px] font-medium">
                    <GitlabAvatar className="size-6 shrink-0 rounded-full object-cover" name={user.name} avatarUrl={user.avatar_url} />
                    <span className="min-w-0 [overflow-wrap:anywhere]">{user.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
