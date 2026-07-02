import type { GitLabMergeRequestDC } from "@/shared/api/gitlab";
import { cx } from "yummies/css";
import { GitlabAvatar } from "@/shared/ui/gitlab-avatar";
import { MrStateBadge } from "@/entities/gitlab-merge-requests/ui/mr-state-badge";

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAuthorName = (mergeRequest: GitLabMergeRequestDC) =>
  mergeRequest.author?.name ?? "Unknown";

const ApprovalCheckCircleIcon = () => (
  <svg
    className="text-green-600 dark:text-green-300"
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6.25" />
    <path d="m4.75 8 2.25 2.25 4.75-4.75" />
  </svg>
);

export const MergeRequestList = ({
  mergeRequests,
  approvalCounts,
  selectedMergeRequestIid,
  onSelect,
}: {
  mergeRequests: GitLabMergeRequestDC[];
  approvalCounts: Record<number, number>;
  selectedMergeRequestIid: number | null;
  onSelect: (mergeRequest: GitLabMergeRequestDC) => void;
}) => {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {mergeRequests.map((mergeRequest) => {
        const isSelected = selectedMergeRequestIid === mergeRequest.iid;
        const authorName = getAuthorName(mergeRequest);
        const authorAvatarUrl = mergeRequest.author?.avatar_url ?? null;
        const approvalCount = approvalCounts[mergeRequest.iid];

        return (
          <li key={mergeRequest.id}>
            <button
              className={cx(
                "flex w-full cursor-pointer flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left text-inherit transition hover:border-brand hover:shadow-[0_4px_16px_var(--color-card-hover-shadow)] dark:border-slate-800 dark:bg-gray-900",
                isSelected && "border-brand shadow-[0_0_0_3px_var(--color-brand-selection-shadow)]",
              )}
              type="button"
              onClick={() => onSelect(mergeRequest)}
            >
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 text-[13px] font-bold text-slate-500">
                  !{mergeRequest.iid}
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-semibold text-slate-900 dark:text-slate-200">
                  {mergeRequest.title}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {approvalCount !== undefined && (
                    <span
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-green-700 dark:text-green-300"
                      title={`${approvalCount} апрув(ов)`}
                    >
                      {approvalCount}
                      <ApprovalCheckCircleIcon />
                    </span>
                  )}
                  <MrStateBadge mergeRequest={mergeRequest} />
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                <span className="font-mono">
                  {mergeRequest.source_branch} → {mergeRequest.target_branch}
                </span>
                <span>{formatUpdatedAt(mergeRequest.updated_at)}</span>
              </div>

              <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400">
                <GitlabAvatar
                  className="h-6 w-6 rounded-full object-cover"
                  avatarUrl={authorAvatarUrl}
                  name={authorName}
                />
                <span>{authorName}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
