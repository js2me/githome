import { observer } from 'mobx-react-lite';
import { withPropsViewModel } from 'mobx-view-model-react';
import {
  createContext,
  memo,
  type ReactNode,
  type Ref,
  useContext,
  useSyncExternalStore,
} from 'react';
import { cn } from '@/shared/lib/cn';
import { DiffSearchVM } from '../model/diff-search';
import {
  EMPTY_ROW_HIGHLIGHT,
  type RowSearchHighlightState,
} from '../model/search-highlights';

export type { DiffSearchFindBarVisibility } from '../model/diff-search';
export type { RowSearchHighlightState } from '../model/search-highlights';

const DiffSearchContext = createContext<DiffSearchVM | null>(null);

const diffSearchControlButtonClassName =
  'glass-control inline-flex size-7 shrink-0 items-center justify-center rounded-md';

const DiffSearchInput = memo(
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

const DiffSearchControls = memo(
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

const DiffSearchFindBar = memo(
  ({
    barRef,
    query,
    activeIndex,
    matchCount,
    inputRef,
    onQueryChange,
    onClose,
    onNext,
    onPrevious,
  }: {
    barRef?: Ref<HTMLDivElement>;
    query: string;
    activeIndex: number;
    matchCount: number;
    inputRef: Ref<HTMLInputElement>;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
  }) => (
    <div
      ref={barRef}
      className="glass-panel mb-5 flex w-full max-w-full items-center gap-1.5 rounded-xl p-2 sm:w-fit sm:max-w-[60vw] sm:gap-2"
    >
      <DiffSearchControls
        variant="full"
        query={query}
        activeIndex={activeIndex}
        matchCount={matchCount}
        inputRef={inputRef}
        onQueryChange={onQueryChange}
        onClose={onClose}
        onNext={onNext}
        onPrevious={onPrevious}
      />
    </div>
  ),
);

export const DiffSearchStickyMiniBar = observer(() => {
  const ui = useContext(DiffSearchContext);
  if (!ui) {
    return null;
  }

  const shouldShow =
    ui.miniBarActive || (!ui.isMainBarInView && ui.query.length > 0);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed top-[62px] right-3 z-40 sm:right-8">
      <div className="glass-overlay pointer-events-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-1.5 rounded-lg px-2 py-1.5 sm:max-w-[60vw]">
        <DiffSearchControls
          variant="mini"
          query={ui.query}
          activeIndex={ui.activeIndex}
          matchCount={ui.matchCount}
          inputRef={ui.miniInputRef}
          onQueryChange={ui.setQuery}
          onClose={ui.onClose}
          onNext={ui.onNext}
          onPrevious={ui.onPrevious}
        />
      </div>
    </div>
  );
});

export const DiffSearchProvider = withPropsViewModel(
  DiffSearchVM,
  ({ model }) => (
    <DiffSearchContext.Provider value={model}>
      {model.showMainBar && (
        <DiffSearchFindBar
          barRef={model.mainBarRef}
          query={model.query}
          activeIndex={model.activeIndex}
          matchCount={model.matchCount}
          inputRef={model.inputRef}
          onQueryChange={model.setQuery}
          onClose={model.onClose}
          onNext={model.onNext}
          onPrevious={model.onPrevious}
        />
      )}
      <DiffSearchStickyMiniBar />
      {model.payload.children}
    </DiffSearchContext.Provider>
  ),
);

export const useDiffSearchRegistration = () => {
  const context = useContext(DiffSearchContext);
  if (!context) {
    throw new Error(
      'useDiffSearchRegistration must be used within DiffSearchProvider',
    );
  }

  return context;
};

export const useDiffSearchRegistrationOptional = () =>
  useContext(DiffSearchContext);

export const useRowSearchHighlight = (rowId?: string) => {
  const store = useContext(DiffSearchContext)?.highlights;

  return useSyncExternalStore(
    (onStoreChange) => {
      if (!store || !rowId) {
        return () => {};
      }

      return store.subscribeRow(rowId, onStoreChange);
    },
    () => {
      if (!store || !rowId) {
        return EMPTY_ROW_HIGHLIGHT;
      }

      return store.getRowState(rowId);
    },
    () => EMPTY_ROW_HIGHLIGHT,
  );
};

/** @deprecated Use useDiffSearchRegistrationOptional */
export const useDiffSearchOptional = () => useContext(DiffSearchContext);

interface SearchHighlightedTextProps extends RowSearchHighlightState {
  text: string;
}

export const renderSearchHighlightedText = (
  { text, ranges, activeRange }: SearchHighlightedTextProps,
  renderPlain: (start: number, end: number) => ReactNode = (start, end) =>
    text.slice(start, end),
) => {
  if (ranges.length === 0) {
    return <>{text.length ? renderPlain(0, text.length) : ' '}</>;
  }
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      nodes.push(renderPlain(cursor, range.start));
    }

    const isActive =
      activeRange?.start === range.start && activeRange.end === range.end;
    nodes.push(
      <mark
        key={range.start}
        className={cn(
          'git-diff-search-mark',
          isActive
            ? 'git-diff-search-mark--active'
            : 'git-diff-search-mark--inactive',
        )}
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );

    cursor = range.end;
  }

  if (cursor < text.length) {
    nodes.push(renderPlain(cursor, text.length));
  }

  return <>{nodes.length ? nodes : ' '}</>;
};

export const SearchHighlightedText = memo((props: SearchHighlightedTextProps) =>
  renderSearchHighlightedText(props),
);
