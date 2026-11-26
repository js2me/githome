import {
  areTextRangesEqual,
  type DiffSearchMatch,
  indexMatchesByRowId,
  type TextRange,
} from '@/shared/lib/diff/diff-search';

export interface RowSearchHighlightState {
  ranges: TextRange[];
  activeRange: TextRange | null;
}

export const EMPTY_ROW_HIGHLIGHT: RowSearchHighlightState = {
  ranges: [],
  activeRange: null,
};

export class DiffSearchHighlightStore {
  private rowStates = new Map<string, RowSearchHighlightState>();
  private rowListeners = new Map<string, Set<() => void>>();
  subscribeRow = (rowId: string, onStoreChange: () => void) => {
    let listeners = this.rowListeners.get(rowId);
    if (!listeners) {
      listeners = new Set();
      this.rowListeners.set(rowId, listeners);
    }

    listeners.add(onStoreChange);
    return () => {
      listeners?.delete(onStoreChange);
      if (listeners?.size === 0) {
        this.rowListeners.delete(rowId);
      }
    };
  };

  getRowState = (rowId: string): RowSearchHighlightState =>
    this.rowStates.get(rowId) ?? EMPTY_ROW_HIGHLIGHT;

  private notifyRow(rowId: string) {
    const listeners = this.rowListeners.get(rowId);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener();
    }
  }

  private setRowState(rowId: string, nextState: RowSearchHighlightState) {
    const previousState = this.rowStates.get(rowId) ?? EMPTY_ROW_HIGHLIGHT;
    const rangesChanged = !areTextRangesEqual(
      previousState.ranges,
      nextState.ranges,
    );
    const activeRangeChanged =
      previousState.activeRange?.start !== nextState.activeRange?.start ||
      previousState.activeRange?.end !== nextState.activeRange?.end;

    if (!rangesChanged && !activeRangeChanged) {
      return;
    }

    if (nextState.ranges.length === 0 && !nextState.activeRange) {
      this.rowStates.delete(rowId);
    } else {
      this.rowStates.set(rowId, nextState);
    }

    this.notifyRow(rowId);
  }

  updateHighlightsForRows(
    matches: DiffSearchMatch[],
    activeMatch: DiffSearchMatch | null,
    changedRowIds: readonly string[],
  ) {
    if (changedRowIds.length === 0) {
      return;
    }

    const matchesByRowId = indexMatchesByRowId(matches);

    for (const rowId of changedRowIds) {
      const ranges = matchesByRowId.get(rowId) ?? [];
      const activeRange =
        activeMatch && activeMatch.rowId === rowId
          ? { start: activeMatch.start, end: activeMatch.end }
          : null;

      this.setRowState(rowId, { ranges, activeRange });
    }
  }

  updateActiveMatch(
    matches: DiffSearchMatch[],
    previousActiveMatch: DiffSearchMatch | null,
    nextActiveMatch: DiffSearchMatch | null,
  ) {
    if (
      previousActiveMatch?.rowId === nextActiveMatch?.rowId &&
      previousActiveMatch?.start === nextActiveMatch?.start &&
      previousActiveMatch?.end === nextActiveMatch?.end
    ) {
      return;
    }

    const matchesByRowId = indexMatchesByRowId(matches);
    const affectedRowIds = new Set<string>();

    if (previousActiveMatch) {
      affectedRowIds.add(previousActiveMatch.rowId);
    }

    if (nextActiveMatch) {
      affectedRowIds.add(nextActiveMatch.rowId);
    }

    for (const rowId of affectedRowIds) {
      const ranges = matchesByRowId.get(rowId) ?? [];
      const activeRange =
        nextActiveMatch && nextActiveMatch.rowId === rowId
          ? { start: nextActiveMatch.start, end: nextActiveMatch.end }
          : null;

      this.setRowState(rowId, { ranges, activeRange });
    }
  }

  clear() {
    const affectedRowIds = [...this.rowStates.keys()];
    this.rowStates.clear();

    for (const rowId of affectedRowIds) {
      this.notifyRow(rowId);
    }
  }
}
