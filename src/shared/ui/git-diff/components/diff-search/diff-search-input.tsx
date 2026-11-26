import { memo, type Ref } from 'react';
import { cn } from '@/shared/lib/cn';

export const DiffSearchInput = memo(
  ({
    variant,
    query,
    inputRef,
    onQueryChange,
    onClose,
    onNext,
    onPrevious,
  }: {
    variant: 'full' | 'mini';
    query: string;
    inputRef: Ref<HTMLInputElement>;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
  }) => {
    const isMini = variant === 'mini';

    return (
      <span
        className={cn(
          'inline-grid min-w-0 max-w-full flex-1 grid-cols-[minmax(0,1fr)]',
          isMini ? 'sm:min-w-20' : 'sm:min-w-60',
        )}
      >
        <span
          className={cn(
            'invisible col-start-1 row-start-1 overflow-hidden whitespace-pre border border-transparent font-mono',
            isMini ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm',
          )}
          aria-hidden
        >
          {query || ' '}
        </span>
        <input
          ref={inputRef}
          className={cn(
            'glass-input col-start-1 row-start-1 w-full min-w-0 rounded-md font-mono',
            isMini ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm',
          )}
          placeholder={isMini ? undefined : 'Поиск по файлам и коду...'}
          aria-label="Поиск по файлам и коду"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (event.shiftKey) {
                onPrevious();
              } else {
                onNext();
              }
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
            }
          }}
        />
      </span>
    );
  },
);
