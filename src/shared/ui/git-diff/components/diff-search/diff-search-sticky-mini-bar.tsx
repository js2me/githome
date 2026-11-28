import { observer } from 'mobx-react-lite';
import { useContext } from 'react';
import { DiffSearchContext } from './diff-search-context';
import { DiffSearchControls } from './diff-search-controls';

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
    <div className="pointer-events-none fixed top-[calc(var(--diff-sticky-top,54px)+8px)] right-3 z-40 sm:right-8">
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
