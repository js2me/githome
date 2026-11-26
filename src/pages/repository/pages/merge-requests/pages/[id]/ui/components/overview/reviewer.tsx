import { Check } from '@gravity-ui/icons';
import type { GitLabMergeRequestReviewerDC } from '@/shared/api/gitlab';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';

const reviewerStates: Record<string, { label: string; tone?: string }> = {
  reviewed: { label: 'Ревью завершено', tone: 'success' },
  approved: { label: 'Одобрено', tone: 'success' },
  requested_changes: { label: 'Запрошены правки', tone: 'changes' },
  reviewing: { label: 'Ревью в процессе', tone: 'active' },
  review_started: { label: 'Ревью в процессе', tone: 'active' },
  unapproved: { label: 'Одобрение отозвано' },
  unreviewed: { label: 'Ожидает ревью' },
};

export const Reviewer = ({
  reviewer,
  approved,
}: {
  reviewer: GitLabMergeRequestReviewerDC;
  approved: boolean;
}) => {
  const requestedChanges = reviewer.state === 'requested_changes';
  const status = approved && !requestedChanges ? 'approved' : reviewer.state;
  const state = reviewerStates[status] ?? { label: status };
  return (
    <li className="flex min-w-0 max-w-full items-center gap-2">
      <GitlabAvatar
        className="size-7 shrink-0 rounded-full object-cover"
        name={reviewer.user.name}
        avatarUrl={reviewer.user.avatar_url}
      />
      <span className="grid min-w-0 gap-0.5">
        <span className="font-medium text-[13px] leading-tight [overflow-wrap:anywhere]">
          {reviewer.user.name}
        </span>
        <span className="flex flex-wrap gap-x-2 gap-y-1 text-xs leading-tight">
          <span
            className="mr-review-state inline-flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]"
            data-tone={state.tone}
          >
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-current"
            />
            {state.label}
          </span>
          {approved && requestedChanges && (
            <span
              className="mr-review-state inline-flex items-center gap-1"
              data-tone="success"
            >
              <Check className="size-3" aria-hidden /> Одобрено
            </span>
          )}
        </span>
      </span>
    </li>
  );
};
