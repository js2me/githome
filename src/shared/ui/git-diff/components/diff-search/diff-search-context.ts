import { createContext, useContext, useSyncExternalStore } from 'react';
import type { DiffSearchVM } from '../../model/diff-search';
import { EMPTY_ROW_HIGHLIGHT } from '../../model/search-highlights';

export const DiffSearchContext = createContext<DiffSearchVM | null>(null);

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
