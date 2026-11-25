import { ChevronRight, CircleCheck, CodeFork, Comment } from "@gravity-ui/icons";
import type { GitLabMergeRequestDC } from "@/shared/api/gitlab";
import { cn } from "@/shared/lib/cn";
import { GitlabAvatar } from "@/shared/ui/gitlab-avatar";
import { MrStateBadge } from "@/entities/gitlab-merge-requests/ui/mr-state-badge";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
};

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
}) => (
  <ul className="m-0 list-none divide-y divide-[var(--glass-border)] p-0">
    {mergeRequests.map((mr) => {
      const authorName = mr.author?.name ?? mr.author?.username ?? "Неизвестный автор";
      const approvals = approvalCounts[mr.iid];
      return (
        <li key={mr.id}>
          <button
            className={cn(
              "group flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-3.5 text-left transition-colors hover:bg-[var(--glass-hover)] focus-visible:-outline-offset-2 sm:gap-4 sm:px-5",
              selectedMergeRequestIid === mr.iid && "bg-[var(--glass-selected)]",
            )}
            type="button"
            aria-label={`Открыть !${mr.iid} ${mr.title}`}
            onClick={() => onSelect(mr)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-mono text-xs font-medium text-fg-muted">!{mr.iid}</span>
                <span className="min-w-0 text-[15px] leading-snug font-semibold [overflow-wrap:anywhere]">{mr.title}</span>
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-muted">
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <GitlabAvatar
                    className="size-5 shrink-0 rounded-full object-cover text-[10px]"
                    avatarUrl={mr.author?.avatar_url}
                    name={authorName}
                  />
                  <span className="truncate">{authorName}</span>
                </span>
                <time dateTime={mr.updated_at} title="Последнее обновление">{formatUpdatedAt(mr.updated_at)}</time>
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5" title={`${mr.source_branch} → ${mr.target_branch}`}>
                  <CodeFork width={13} height={13} className="shrink-0" aria-hidden />
                  <span className="truncate font-mono text-[11px]">{mr.source_branch} → {mr.target_branch}</span>
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <MrStateBadge mergeRequest={mr} />
              <div className="flex items-center gap-2 text-xs text-fg-muted tabular-nums">
                {approvals != null && (
                  <span className="inline-flex items-center gap-1" title={`Одобрений: ${approvals}`}>
                    <CircleCheck width={14} height={14} aria-hidden />
                    {approvals}
                  </span>
                )}
                {mr.user_notes_count != null && mr.user_notes_count > 0 && (
                  <span className="inline-flex items-center gap-1" title={`Комментариев: ${mr.user_notes_count}`}>
                    <Comment width={14} height={14} aria-hidden />
                    {mr.user_notes_count}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight width={16} height={16} className="hidden shrink-0 text-fg-muted group-hover:text-[var(--glass-accent)] sm:block" aria-hidden />
          </button>
        </li>
      );
    })}
  </ul>
);
