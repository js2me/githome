import type {
  GitLabMergeRequestApprovalView,
  GitLabMergeRequestDetail,
  GitLabMergeRequestReviewer,
} from "@/shared/api/gitlab";
import type { MrReviewAction } from "../../model/mr-info";
import { StatusMessage } from "@/shared/ui/status-message";

const getReviewerStateLabel = (state: string) => {
  switch (state) {
    case "reviewed":
      return "Одобрил";
    case "requested_changes":
      return "Запросил правки";
    case "reviewing":
      return "Ревью в процессе";
    case "unreviewed":
      return "Ожидает ревью";
    default:
      return state;
  }
};

const ReviewerAvatar = ({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) =>
  avatarUrl ? (
    <img
      className="h-6 w-6 rounded-full object-cover"
      src={avatarUrl}
      alt=""
      title={name}
    />
  ) : (
    <div
      className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
      title={name}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );

const ReviewerRow = ({ reviewer }: { reviewer: GitLabMergeRequestReviewer }) => {
  const isApproved = reviewer.state === "reviewed";
  const requestedChanges = reviewer.state === "requested_changes";

  return (
    <div className="flex items-center gap-2 text-[13px]">
      <ReviewerAvatar
        name={reviewer.user.name}
        avatarUrl={reviewer.user.avatarUrl}
      />
      <span className="text-slate-700 dark:text-slate-300">
        {reviewer.user.name}
      </span>
      <span
        className={
          requestedChanges
            ? "rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-200"
            : isApproved
              ? "rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-300"
              : "rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        }
      >
        {getReviewerStateLabel(reviewer.state)}
      </span>
    </div>
  );
};

const actionButtonClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg px-3.5 py-2 text-[13px] font-semibold transition disabled:cursor-wait disabled:opacity-50";

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
  mergeRequest: GitLabMergeRequestDetail;
  approvals: GitLabMergeRequestApprovalView;
  reviewActionInProgress: MrReviewAction | null;
  reviewActionError: string | null;
  onApprove: () => void;
  onUnapprove: () => void;
  onRequestChanges: () => void;
  onCancelRequestChanges: () => void;
}) => {
  if (mergeRequest.state !== "opened" || mergeRequest.draft) {
    return null;
  }

  const isBusy = reviewActionInProgress !== null;
  const approvalsSummary =
    approvals.approvalsRequired !== null
      ? `${approvals.approvedBy.length}/${approvals.approvalsRequired} апрувов`
      : approvals.approvedBy.length > 0
        ? `${approvals.approvedBy.length} апрув(ов)`
        : null;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-gray-900">
      {reviewActionError && (
        <StatusMessage error className="mt-0">
          {reviewActionError}
        </StatusMessage>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="m-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Ревью
          </h3>
          {approvalsSummary && (
            <span className="text-[13px] text-slate-500">{approvalsSummary}</span>
          )}
          {!approvals.approvalsAvailable && (
            <span className="text-[12px] text-slate-400">
              Апрувы недоступны на этом инстансе GitLab
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {approvals.currentUserRequestedChanges ? (
            <button
              type="button"
              className={`${actionButtonClass} border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900`}
              disabled={isBusy}
              onClick={onCancelRequestChanges}
            >
              {reviewActionInProgress === "cancelRequestChanges"
                ? "Отмена..."
                : "Отозвать запрос правок"}
            </button>
          ) : (
            <button
              type="button"
              className={`${actionButtonClass} border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-[#0d1117] dark:text-red-300 dark:hover:bg-red-950`}
              disabled={isBusy}
              onClick={onRequestChanges}
            >
              {reviewActionInProgress === "requestChanges"
                ? "Отправка..."
                : "Request changes"}
            </button>
          )}

          {approvals.approvalsAvailable &&
            (approvals.currentUserApproved ? (
              <button
                type="button"
                className={`${actionButtonClass} border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-200 dark:hover:bg-green-900`}
                disabled={isBusy}
                onClick={onUnapprove}
              >
                {reviewActionInProgress === "unapprove"
                  ? "Отмена..."
                  : "Отозвать апрув"}
              </button>
            ) : (
              <button
                type="button"
                className={`${actionButtonClass} border-none bg-[#1aaa55] text-white hover:bg-[#168f48]`}
                disabled={isBusy}
                onClick={onApprove}
              >
                {reviewActionInProgress === "approve" ? "Апрув..." : "Approve"}
              </button>
            ))}
        </div>
      </div>

      {approvals.approvedBy.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            Одобрили
          </span>
          <div className="flex flex-wrap gap-3">
            {approvals.approvedBy.map((entry) => (
              <div key={entry.user.id} className="flex items-center gap-2 text-[13px]">
                <ReviewerAvatar
                  name={entry.user.name}
                  avatarUrl={entry.user.avatarUrl}
                />
                <span className="text-slate-700 dark:text-slate-300">
                  {entry.user.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {approvals.reviewers.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            Reviewers
          </span>
          <div className="flex flex-col gap-2">
            {approvals.reviewers.map((reviewer) => (
              <ReviewerRow key={reviewer.user.id} reviewer={reviewer} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
