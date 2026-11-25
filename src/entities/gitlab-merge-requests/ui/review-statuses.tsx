import {
  CircleCheck,
  CodePullRequestCheck,
  CommentDot,
  Pencil,
} from '@gravity-ui/icons';
import type {
  GitLabMergeRequestApprovalSummary,
  GitLabMergeRequestDiscussionSummary,
} from '@/shared/api/gitlab';
import { cn } from '@/shared/lib/cn';

const badgeClass =
  'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] leading-none font-semibold tabular-nums';
const positiveClass =
  'border-green-700/20 bg-green-100/55 text-green-800 dark:border-green-300/25 dark:bg-green-900/35 dark:text-green-300';

export function ReviewStatuses({
  approval,
  discussions,
  review,
}: {
  review?: 'requested' | 'waiting';
  approval?: GitLabMergeRequestApprovalSummary;
  discussions?: GitLabMergeRequestDiscussionSummary;
}) {
  const resolved = discussions && discussions.resolved === discussions.total;
  return (
    <>
      {review === 'requested' ? (
        <span
          className={cn(
            badgeClass,
            'border-red-700/20 bg-red-100/55 text-red-800 dark:border-red-300/25 dark:bg-red-950/35 dark:text-red-300',
          )}
          title="Ревьюер запросил изменения"
        >
          <Pencil width={13} height={13} aria-hidden /> Requested
        </span>
      ) : review === 'waiting' && !approval?.approved ? (
        <span
          className={cn(
            badgeClass,
            'border-[var(--glass-border)] text-fg-muted',
          )}
        >
          Ожидает ревью
        </span>
      ) : null}
      {approval &&
        (approval.approved && review !== 'requested' ? (
          <span
            className={cn(badgeClass, positiveClass)}
            title={`MR одобрен. Одобрений: ${approval.count}`}
          >
            <CodePullRequestCheck width={14} height={14} aria-hidden />
            Approved <span aria-hidden>·</span> {approval.count}
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-fg-muted text-xs"
            title="Количество полученных одобрений"
          >
            <CodePullRequestCheck width={14} height={14} aria-hidden />
            Одобрений {approval.count}
          </span>
        ))}
      {discussions && discussions.total > 0 && (
        <span
          className={cn(
            badgeClass,
            resolved
              ? positiveClass
              : 'border-amber-600/25 bg-amber-500/10 text-amber-800 dark:text-amber-300',
          )}
          title={`Закрыто обсуждений: ${discussions.resolved} из ${discussions.total}`}
        >
          {resolved ? (
            <CircleCheck width={14} height={14} aria-hidden />
          ) : (
            <CommentDot width={14} height={14} aria-hidden />
          )}
          {resolved
            ? `Resolved ${discussions.resolved}/${discussions.total}`
            : `Unresolved · ${discussions.total - discussions.resolved}`}
        </span>
      )}
    </>
  );
}
