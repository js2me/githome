import { memo, type Ref } from 'react';
import { cn } from '@/shared/lib/cn';
import { DiffSearchInput } from './diff-search-input';

const diffSearchControlButtonClassName =
  'glass-control inline-flex size-7 shrink-0 items-center justify-center rounded-md';

export const DiffSearchControls = memo(
  ({
    variant,
    query,
    activeIndex,
    matchCount,
    inputRef,
    onQueryChange,
    onClose,
    onNext,
    onPrevious,
  }: {
    variant: 'full' | 'mini';
    query: string;
    activeIndex: number;
    matchCount: number;
    inputRef: Ref<HTMLInputElement>;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
  }) => {
    const isMini = variant === 'mini';

    return (
      <>
        <DiffSearchInput
          variant={variant}
          query={query}
          inputRef={inputRef}
          onQueryChange={onQueryChange}
          onClose={onClose}
          onNext={onNext}
          onPrevious={onPrevious}
        />
        {query.trim() && (
          <span
            className={cn(
              'shrink-0 text-fg-muted',
              isMini ? 'text-[11px]' : 'text-xs',
            )}
          >
            {matchCount > 0
              ? `${activeIndex + 1} / ${matchCount}`
              : 'Нет совпадений'}
          </span>
        )}
        <button
          className={cn(
            diffSearchControlButtonClassName,
            isMini && 'h-6 w-6 text-xs',
          )}
          type="button"
          title="Предыдущее (Shift+Enter)"
          disabled={matchCount === 0}
          onClick={onPrevious}
        >
          ↑
        </button>
        <button
          className={cn(
            diffSearchControlButtonClassName,
            isMini && 'h-6 w-6 text-xs',
          )}
          type="button"
          title="Следующее (Enter)"
          disabled={matchCount === 0}
          onClick={onNext}
        >
          ↓
        </button>
      </>
    );
  },
);
