import { memo } from 'react';
import { cn } from '@/shared/lib/cn';

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    className="h-3.5 w-3.5"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
);

export const DiscussionResolveActions = memo(
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
              ? 'Открываем...'
              : 'Разрешаем...'
            : resolved
              ? 'Открыть тред'
              : 'Разрешить тред'}
        </button>
      </div>
    );
  },
);
