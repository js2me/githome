import { observer } from 'mobx-react-lite';
import { cva, type VariantProps } from 'yummies/css';
import type { GitLabMergeRequestDC } from '@/shared/api/gitlab';
import { type MessageKey, t } from '@/shared/lib/i18n';

export const mrStateBadgeVariants = cva(
  'inline-flex shrink-0 items-center rounded-full border font-semibold leading-none',
  {
    variants: {
      state: {
        draft:
          'border-[var(--glass-border)] bg-[var(--glass-control)] text-fg-muted',
        opened:
          'border-green-700/20 bg-green-100/55 text-green-800 dark:border-green-300/25 dark:bg-green-900/35 dark:text-green-300',
        merged:
          'border-blue-700/20 bg-blue-100/55 text-blue-700 dark:border-blue-300/25 dark:bg-blue-950/35 dark:text-blue-300',
        closed:
          'border-red-700/20 bg-red-100/55 text-red-800 dark:border-red-300/25 dark:bg-red-950/35 dark:text-red-300',
      },
      size: {
        sm: 'px-2 py-1 text-[11px]',
        md: 'px-2.5 py-1 text-[11px]',
      },
    },
    defaultVariants: {
      state: 'draft',
      size: 'sm',
    },
  },
);

export type MrStateBadgeState = NonNullable<
  VariantProps<typeof mrStateBadgeVariants>['state']
>;

export const getMrStateBadgeState = (state: string): MrStateBadgeState => {
  if (
    state === 'draft' ||
    state === 'opened' ||
    state === 'merged' ||
    state === 'closed'
  ) {
    return state;
  }

  return 'draft';
};

const isDraft = (mergeRequest: GitLabMergeRequestDC) =>
  mergeRequest.draft ?? mergeRequest.work_in_progress ?? false;

const stateLabels: Record<string, MessageKey> = {
  draft: 'review.draft',
  opened: 'review.open',
  merged: 'review.merged',
  closed: 'review.closed',
  locked: 'review.locked',
  reopened: 'review.reopened',
};

export const MrStateBadge = observer(
  ({
    mergeRequest,
    size = 'sm',
  }: {
    mergeRequest: GitLabMergeRequestDC;
    size?: NonNullable<VariantProps<typeof mrStateBadgeVariants>['size']>;
  }) => {
    const stateKey =
      mergeRequest.state === 'opened' && isDraft(mergeRequest)
        ? 'draft'
        : mergeRequest.state;
    const labelKey = Object.hasOwn(stateLabels, stateKey)
      ? stateLabels[stateKey]
      : undefined;

    return (
      <span
        className={mrStateBadgeVariants({
          state: getMrStateBadgeState(stateKey),
          size,
        })}
      >
        {labelKey ? t(labelKey) : stateKey}
      </span>
    );
  },
);
