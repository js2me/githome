import {
  CircleCheck,
  CircleDashed,
  CodeMerge,
  CodePullRequest,
  CodePullRequestCheck,
  CodePullRequestXmark,
  CommentDot,
  Pencil,
} from '@gravity-ui/icons';
import type { MergeRequestNavItem } from '@/features/workspace-navigation';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { WorkspaceReview } from '../../model/workspace/review-query';

export function WorkspaceMrStatuses({
  status,
  review,
}: {
  status?: MergeRequestNavItem['payload']['status'];
  review?: WorkspaceReview;
}) {
  const badges = [];
  const positive = 'text-green-700 dark:text-green-300';
  const attention = 'text-amber-700 dark:text-amber-300';
  if (status?.state === 'merged') {
    badges.push({
      Icon: CodeMerge,
      label: t('review.merged'),
      color: 'text-brand',
    });
  } else if (status?.state === 'closed') {
    badges.push({
      Icon: CodePullRequestXmark,
      label: t('review.closed'),
      color: 'text-fg-muted',
    });
  } else if (status?.draft ?? status?.work_in_progress) {
    badges.push({
      Icon: CircleDashed,
      label: t('review.draft'),
      color: 'text-fg-muted',
    });
  }
  const changesRequested =
    status?.detailed_merge_status === 'requested_changes';
  if (changesRequested) {
    badges.push({
      Icon: Pencil,
      label: t('review.changesRequested'),
      color: attention,
    });
  }
  const { approval, discussions } = review ?? {};
  if (approval) {
    const approved = approval.approved && !changesRequested;
    badges.push({
      Icon: approved ? CodePullRequestCheck : CodePullRequest,
      label: approved
        ? t('review.mergeRequestApprovedApprovals', { v1: approval.count })
        : `${t('review.approvals')} ${approval.count}`,
      color: approved ? positive : 'text-fg-muted',
    });
  }
  if (discussions && discussions.total > 0) {
    const resolved = discussions.resolved === discussions.total;
    badges.push({
      Icon: resolved ? CircleCheck : CommentDot,
      label: t('review.resolvedDiscussionsOf', {
        v1: discussions.resolved,
        v2: discussions.total,
      }),
      color: resolved ? positive : attention,
    });
  }

  if (!badges.length) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {badges.map(({ Icon, label, color }) => (
        <span key={label} title={label} className={cn('inline-flex', color)}>
          <Icon className="size-3.5" aria-hidden />
          <span className="sr-only">{label}</span>
        </span>
      ))}
    </span>
  );
}
