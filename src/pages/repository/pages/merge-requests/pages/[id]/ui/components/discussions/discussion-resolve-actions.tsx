import { observer } from 'mobx-react-lite';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { CheckIcon } from './check-icon';

export const DiscussionResolveActions = observer(
  ({
    discussionId,
    resolved,
    resolvable,
    isResolving,
    onResolve,
    className,
  }: {
    discussionId: string;
    resolved: boolean;
    resolvable: boolean;
    isResolving: boolean;
    onResolve: (discussionId: string, resolved: boolean) => void;
    className?: string;
  }) => {
    if (!resolvable) {
      return null;
    }

    return (
      <div className={cn('flex items-center justify-end gap-2', className)}>
        <button
          className="glass-control inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold text-xs disabled:cursor-wait"
          type="button"
          disabled={isResolving}
          onClick={() => onResolve(discussionId, !resolved)}
        >
          <CheckIcon />
          {isResolving
            ? resolved
              ? t('review.reopening')
              : t('review.resolving')
            : resolved
              ? t('review.reopenThread')
              : t('review.resolveThread')}
        </button>
      </div>
    );
  },
);
