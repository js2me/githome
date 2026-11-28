import { ChevronRight, CodeFork } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { getLocale, t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';

interface Props {
  label: string;
  number: string;
  title: string;
  authorName: string;
  avatarUrl?: string | null;
  updatedAt?: string;
  sourceBranch: string;
  targetBranch: string;
  status: ReactNode;
  statusId: string;
  selected?: boolean;
  onSelect: () => void;
}

export const RequestRow = observer((props: Props) => {
  const {
    number,
    title,
    authorName,
    sourceBranch,
    targetBranch,
    statusId,
    updatedAt,
  } = props;
  const date = updatedAt ? new Date(updatedAt) : null;
  return (
    <li>
      <button
        className={cn(
          'group flex w-full cursor-pointer flex-wrap items-center gap-2.5 px-3.5 py-3.5 text-left transition-colors hover:bg-[var(--glass-hover)] focus-visible:-outline-offset-2 sm:flex-nowrap sm:gap-4 sm:px-5',
          props.selected && 'bg-[var(--glass-selected)]',
        )}
        type="button"
        aria-label={props.label}
        aria-describedby={statusId}
        onClick={props.onSelect}
      >
        <div className="min-w-0 basis-full sm:flex-1">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 font-medium font-mono text-fg-muted text-xs">
              {number}
            </span>
            <span className="min-w-0 font-semibold text-[15px] leading-snug [overflow-wrap:anywhere]">
              {title}
            </span>
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-fg-muted text-xs">
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
              <GitlabAvatar
                className="size-5 shrink-0 rounded-full object-cover text-[10px]"
                avatarUrl={props.avatarUrl}
                name={authorName}
              />
              <span className="truncate">{authorName}</span>
            </span>
            {date && (
              <time dateTime={updatedAt} title={t('review.lastUpdated')}>
                {Number.isNaN(date.getTime())
                  ? updatedAt
                  : date.toLocaleString(getLocale(), {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
              </time>
            )}
            <span
              className="inline-flex min-w-0 max-w-full items-center gap-1.5"
              title={`${sourceBranch} → ${targetBranch}`}
            >
              <CodeFork
                width={13}
                height={13}
                className="shrink-0"
                aria-hidden
              />
              <span className="truncate font-mono text-[11px]">
                {sourceBranch} → {targetBranch}
              </span>
            </span>
          </div>
        </div>
        <div
          id={statusId}
          className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1.5 sm:max-w-[50%] sm:justify-end"
        >
          {props.status}
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
});
