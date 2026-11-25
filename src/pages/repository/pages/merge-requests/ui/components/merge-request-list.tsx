import { ChevronRight, CodeFork, Comment } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { MrStateBadge, ReviewStatuses } from '@/entities/gitlab-merge-requests';
import { cn } from '@/shared/lib/cn';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import { MrListPageVM } from '../../model/mr-list-page';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
};

export const MergeRequestListRows = withPropsViewModel(
  MrListPageVM,
  ({ model }) => {
    const { mergeRequests, selectedMergeRequestIid, onSelect } = model.payload;
    const approvals = model.approvals.error ? undefined : model.approvals.data;
    const discussions = model.discussions.error
      ? undefined
      : model.discussions.data;
    return (
      <>
        {mergeRequests.map((mr) => {
          const authorName =
            mr.author?.name ?? mr.author?.username ?? 'Неизвестный автор';
          const statusId = `mr-list-status-${mr.id}`;
          return (
            <li key={mr.id}>
              <button
                className={cn(
                  'group flex w-full cursor-pointer flex-wrap items-center gap-2.5 px-3.5 py-3.5 text-left transition-colors hover:bg-[var(--glass-hover)] focus-visible:-outline-offset-2 sm:flex-nowrap sm:gap-4 sm:px-5',
                  selectedMergeRequestIid === mr.iid &&
                    'bg-[var(--glass-selected)]',
                )}
                type="button"
                aria-label={`Открыть !${mr.iid} ${mr.title}`}
                aria-describedby={statusId}
                onClick={() => onSelect(mr)}
              >
                <div className="min-w-0 basis-full sm:flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-medium font-mono text-fg-muted text-xs">
                      !{mr.iid}
                    </span>
                    <span className="min-w-0 font-semibold text-[15px] leading-snug [overflow-wrap:anywhere]">
                      {mr.title}
                    </span>
                  </div>
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-fg-muted text-xs">
                    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                      <GitlabAvatar
                        className="size-5 shrink-0 rounded-full object-cover text-[10px]"
                        avatarUrl={mr.author?.avatar_url}
                        name={authorName}
                      />
                      <span className="truncate">{authorName}</span>
                    </span>
                    <time dateTime={mr.updated_at} title="Последнее обновление">
                      {formatUpdatedAt(mr.updated_at)}
                    </time>
                    <span
                      className="inline-flex min-w-0 max-w-full items-center gap-1.5"
                      title={`${mr.source_branch} → ${mr.target_branch}`}
                    >
                      <CodeFork
                        width={13}
                        height={13}
                        className="shrink-0"
                        aria-hidden
                      />
                      <span className="truncate font-mono text-[11px]">
                        {mr.source_branch} → {mr.target_branch}
                      </span>
                    </span>
                  </div>
                </div>
                <div
                  id={statusId}
                  className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1.5 sm:max-w-[50%] sm:justify-end"
                >
                  <MrStateBadge mergeRequest={mr} />
                  <ReviewStatuses
                    approval={approvals?.[mr.iid]}
                    discussions={discussions?.[mr.iid]}
                  />
                  {mr.user_notes_count != null && mr.user_notes_count > 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-fg-muted text-xs tabular-nums"
                      title={`Комментариев: ${mr.user_notes_count}`}
                    >
                      <Comment width={14} height={14} aria-hidden />
                      <span className="sr-only">Комментариев </span>
                      {mr.user_notes_count}
                    </span>
                  )}
                </div>
                <ChevronRight
                  width={16}
                  height={16}
                  className="hidden shrink-0 text-fg-muted group-hover:text-[var(--glass-accent)] sm:block"
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </>
    );
  },
);
