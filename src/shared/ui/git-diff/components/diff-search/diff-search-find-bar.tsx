import { memo, type Ref } from 'react';
import { DiffSearchControls } from './diff-search-controls';

export const DiffSearchFindBar = memo(
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
