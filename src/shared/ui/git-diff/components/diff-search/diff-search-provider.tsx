import { withPropsViewModel } from 'mobx-view-model-react';
import { DiffSearchVM } from '../../model/diff-search';
import { DiffSearchContext } from './diff-search-context';
import { DiffSearchFindBar } from './diff-search-find-bar';
import { DiffSearchStickyMiniBar } from './diff-search-sticky-mini-bar';

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
