import {
  createContext,
  memo,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type Ref,
} from "react";
import {
  areTextRangesEqual,
  collectDiffSearchMatches,
  type DiffSearchFileEntry,
  type DiffSearchLineEntry,
  type DiffSearchMatch,
  getDiffFileElementId,
  indexMatchesByRowId,
  isDiffFileHeaderRowId,
  type TextRange,
} from "@/shared/lib/diff-search";
import { cn } from "@/shared/lib/cn";
import { registerFindShortcutHandler } from "@/shared/lib/find-shortcut";

interface DiffSearchRegistrationContextValue {
  registerFile: (
    fileKey: string,
    path: string,
    lines: DiffSearchLineEntry[],
    scrollToRow: (rowId: string) => void,
  ) => void;
  unregisterFile: (fileKey: string) => void;
}

interface DiffSearchUiContextValue {
  query: string;
  setQuery: (value: string) => void;
  activeIndex: number;
  matchCount: number;
  miniBarActive: boolean;
  isMainBarInView: boolean;
  inputRef: Ref<HTMLInputElement>;
  miniInputRef: Ref<HTMLInputElement>;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

const DiffSearchRegistrationContext =
  createContext<DiffSearchRegistrationContextValue | null>(null);

const DiffSearchUiContext = createContext<DiffSearchUiContextValue | null>(null);

const DiffSearchHighlightStoreContext =
  createContext<DiffSearchHighlightStore | null>(null);

interface RowSearchHighlightState {
  ranges: TextRange[];
  activeRange: TextRange | null;
}

const EMPTY_ROW_HIGHLIGHT: RowSearchHighlightState = {
  ranges: [],
  activeRange: null,
};

class DiffSearchHighlightStore {
  private rowStates = new Map<string, RowSearchHighlightState>();
  private rowListeners = new Map<string, Set<() => void>>();
  private hasActiveQuery = false;
  private globalListeners = new Set<() => void>();

  subscribeGlobal = (onStoreChange: () => void) => {
    this.globalListeners.add(onStoreChange);
    return () => {
      this.globalListeners.delete(onStoreChange);
    };
  };

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

  getHasActiveQuery = () => this.hasActiveQuery;

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

  private notifyGlobal() {
    for (const listener of this.globalListeners) {
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

  updateHighlights(
    query: string,
    matches: DiffSearchMatch[],
    activeMatch: DiffSearchMatch | null,
  ) {
    const nextHasActiveQuery = Boolean(query.trim());
    const hasActiveQueryChanged = this.hasActiveQuery !== nextHasActiveQuery;
    this.hasActiveQuery = nextHasActiveQuery;

    const matchesByRowId = indexMatchesByRowId(matches);
    const affectedRowIds = new Set<string>([
      ...this.rowStates.keys(),
      ...matchesByRowId.keys(),
    ]);

    if (activeMatch) {
      affectedRowIds.add(activeMatch.rowId);
    }

    for (const rowId of affectedRowIds) {
      const ranges = matchesByRowId.get(rowId) ?? [];
      const activeRange =
        activeMatch && activeMatch.rowId === rowId
          ? { start: activeMatch.start, end: activeMatch.end }
          : null;

      this.setRowState(rowId, { ranges, activeRange });
    }

    if (hasActiveQueryChanged) {
      this.notifyGlobal();
    }
  }

  clear() {
    const affectedRowIds = [...this.rowStates.keys()];
    this.rowStates.clear();
    this.hasActiveQuery = false;

    for (const rowId of affectedRowIds) {
      this.notifyRow(rowId);
    }

    this.notifyGlobal();
  }
}

const diffSearchControlButtonClassName =
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-[var(--color-border-default)] bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-[var(--color-canvas-muted)]";

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
    variant: "full" | "mini";
    query: string;
    activeIndex: number;
    matchCount: number;
    inputRef: Ref<HTMLInputElement>;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
  }) => {
    const isMini = variant === "mini";

    return (
      <>
        <input
          ref={inputRef}
          className={cn(
            "rounded-md border border-[var(--color-border-default)] bg-white font-mono text-[var(--color-fg-default)] outline-none focus:border-brand focus:shadow-[0_0_0_2px_var(--color-brand-focus-shadow)] dark:bg-canvas-default",
            isMini
              ? "w-[140px] px-2 py-1 text-xs"
              : "min-w-[180px] flex-1 px-2.5 py-1.5 text-sm",
          )}
          placeholder={isMini ? undefined : "Поиск по файлам и коду..."}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (event.shiftKey) {
                onPrevious();
              } else {
                onNext();
              }
            }

            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
          }}
        />
        <span
          className={cn(
            "shrink-0 text-slate-500 dark:text-slate-400",
            isMini ? "text-[11px]" : "text-xs",
          )}
        >
          {query.trim()
            ? matchCount > 0
              ? `${activeIndex + 1} / ${matchCount}`
              : "Нет совпадений"
            : isMini
              ? null
              : "Введите текст"}
        </span>
        <button
          className={cn(
            diffSearchControlButtonClassName,
            isMini && "h-6 w-6 text-xs",
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
            isMini && "h-6 w-6 text-xs",
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
      className="mb-5 flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] px-3 py-2"
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

export const DiffSearchStickyMiniBar = memo(() => {
  const ui = useContext(DiffSearchUiContext);
  if (!ui) {
    return null;
  }

  const shouldShow =
    ui.miniBarActive || (!ui.isMainBarInView && ui.query.length > 0);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-8 top-[62px] z-40">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] px-2 py-1.5">
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

export type DiffSearchFindBarVisibility = "toggle" | "always";

export const DiffSearchProvider = memo(
  ({
    children,
    findBarVisibility = "toggle",
  }: {
    children: ReactNode;
    findBarVisibility?: DiffSearchFindBarVisibility;
  }) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(findBarVisibility === "always");
  const [miniBarActive, setMiniBarActive] = useState(false);
  const [isMainBarInView, setIsMainBarInView] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [focusRequestId, setFocusRequestId] = useState(0);
  const [registryVersion, setRegistryVersion] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const miniInputRef = useRef<HTMLInputElement>(null);
  const mainBarRef = useRef<HTMLDivElement>(null);
  const fileEntriesRef = useRef<Map<string, DiffSearchFileEntry>>(new Map());
  const scrollHandlersRef = useRef<Map<string, (rowId: string) => void>>(new Map());
  const highlightStoreRef = useRef<DiffSearchHighlightStore | null>(null);

  if (!highlightStoreRef.current) {
    highlightStoreRef.current = new DiffSearchHighlightStore();
  }

  const highlightStore = highlightStoreRef.current;
  const matchesRef = useRef<DiffSearchMatch[]>([]);

  const matches = useMemo(() => {
    void registryVersion;
    const nextMatches = collectDiffSearchMatches(
      fileEntriesRef.current,
      deferredQuery,
    );
    matchesRef.current = nextMatches;
    return nextMatches;
  }, [deferredQuery, registryVersion]);

  const activeMatch = matches[activeIndex] ?? null;

  const scrollToActiveMatch = useCallback(
    (match: DiffSearchMatch | null) => {
      if (!match) {
        return;
      }

      document
        .getElementById(getDiffFileElementId(match.fileKey))
        ?.scrollIntoView({ block: "nearest" });

      if (isDiffFileHeaderRowId(match.rowId)) {
        return;
      }

      requestAnimationFrame(() => {
        scrollHandlersRef.current.get(match.fileKey)?.(match.rowId);
      });
    },
    [],
  );

  const goToMatch = useCallback(
    (index: number) => {
      const currentMatches = matchesRef.current;
      if (currentMatches.length === 0) {
        return;
      }

      const normalizedIndex =
        ((index % currentMatches.length) + currentMatches.length) %
        currentMatches.length;
      setActiveIndex(normalizedIndex);
      scrollToActiveMatch(currentMatches[normalizedIndex] ?? null);
    },
    [scrollToActiveMatch],
  );

  const goToNext = useCallback(() => {
    goToMatch(activeIndex + 1);
  }, [activeIndex, goToMatch]);

  const goToPrevious = useCallback(() => {
    goToMatch(activeIndex - 1);
  }, [activeIndex, goToMatch]);

  const isMainFindBarVisible = useCallback(() => {
    const mainBar = mainBarRef.current;
    if (!mainBar) {
      return false;
    }

    const rect = mainBar.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }, []);

  const close = useCallback(() => {
    if (findBarVisibility === "always") {
      setQuery("");
      setActiveIndex(0);
      setMiniBarActive(false);
      highlightStore.clear();
      inputRef.current?.blur();
      miniInputRef.current?.blur();
      return;
    }

    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
    setMiniBarActive(false);
    highlightStore.clear();
  }, [findBarVisibility, highlightStore]);

  const open = useCallback(() => {
    setIsOpen(true);

    const mainBarVisible = isMainFindBarVisible();
    setIsMainBarInView(mainBarVisible);
    setMiniBarActive(!mainBarVisible);
    setFocusRequestId((value) => value + 1);
  }, [isMainFindBarVisible]);

  useLayoutEffect(() => {
    if (focusRequestId === 0) {
      return;
    }

    const focusSearchInput = () => {
      if (miniBarActive) {
        const miniInput = miniInputRef.current;
        if (!miniInput) {
          return false;
        }

        miniInput.focus();
        miniInput.select();
        return true;
      }

      const mainInput = inputRef.current;
      if (!mainInput) {
        return false;
      }

      mainInput.focus();
      mainInput.select();
      return true;
    };

    if (focusSearchInput()) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      focusSearchInput();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [focusRequestId, miniBarActive]);

  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    registerFindShortcutHandler(() => {
      openRef.current();
    });

    return () => {
      registerFindShortcutHandler(null);
    };
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQuery]);

  useEffect(() => {
    const mainBar = mainBarRef.current;
    if (!mainBar) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMainBarInView(entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(mainBar);

    return () => {
      observer.disconnect();
    };
  }, [findBarVisibility, isOpen]);

  useEffect(() => {
    if (isMainBarInView) {
      setMiniBarActive(false);
    }
  }, [isMainBarInView]);

  useEffect(() => {
    highlightStore.updateHighlights(deferredQuery, matches, activeMatch);
  }, [activeMatch, deferredQuery, highlightStore, matches]);

  useEffect(() => {
    if (!deferredQuery.trim()) {
      return;
    }

    const firstMatch = matchesRef.current[0];
    if (firstMatch) {
      scrollToActiveMatch(firstMatch);
    }
  }, [deferredQuery, scrollToActiveMatch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const findBarVisible =
        findBarVisibility === "always" || isOpen;

      if (!findBarVisible) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "F3") {
        event.preventDefault();
        if (event.shiftKey) {
          goToPrevious();
        } else {
          goToNext();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [close, findBarVisibility, goToNext, goToPrevious, isOpen]);

  const registerFile = useCallback(
    (
      fileKey: string,
      path: string,
      lines: DiffSearchLineEntry[],
      scrollToRow: (rowId: string) => void,
    ) => {
      fileEntriesRef.current.set(fileKey, { path, lines });
      scrollHandlersRef.current.set(fileKey, scrollToRow);
      setRegistryVersion((value) => value + 1);
    },
    [],
  );

  const unregisterFile = useCallback((fileKey: string) => {
    fileEntriesRef.current.delete(fileKey);
    scrollHandlersRef.current.delete(fileKey);
    setRegistryVersion((value) => value + 1);
  }, []);

  const registrationValue = useMemo<DiffSearchRegistrationContextValue>(
    () => ({
      registerFile,
      unregisterFile,
    }),
    [registerFile, unregisterFile],
  );

  const uiValue = useMemo<DiffSearchUiContextValue>(
    () => ({
      query,
      setQuery,
      activeIndex,
      matchCount: matches.length,
      miniBarActive,
      isMainBarInView,
      inputRef,
      miniInputRef,
      onClose: close,
      onNext: goToNext,
      onPrevious: goToPrevious,
    }),
    [
      query,
      activeIndex,
      matches.length,
      miniBarActive,
      isMainBarInView,
      close,
      goToNext,
      goToPrevious,
    ],
  );

  return (
    <DiffSearchHighlightStoreContext.Provider value={highlightStore}>
      <DiffSearchRegistrationContext.Provider value={registrationValue}>
        <DiffSearchUiContext.Provider value={uiValue}>
          {(findBarVisibility === "always" || isOpen) && (
            <DiffSearchFindBar
              barRef={mainBarRef}
              query={query}
              activeIndex={activeIndex}
              matchCount={matches.length}
              inputRef={inputRef}
              onQueryChange={setQuery}
              onClose={close}
              onNext={goToNext}
              onPrevious={goToPrevious}
            />
          )}
          <DiffSearchStickyMiniBar />
          {children}
        </DiffSearchUiContext.Provider>
      </DiffSearchRegistrationContext.Provider>
    </DiffSearchHighlightStoreContext.Provider>
  );
  },
);

export const useDiffSearchRegistration = () => {
  const context = useContext(DiffSearchRegistrationContext);
  if (!context) {
    throw new Error(
      "useDiffSearchRegistration must be used within DiffSearchProvider",
    );
  }

  return context;
};

export const useDiffSearchRegistrationOptional = () =>
  useContext(DiffSearchRegistrationContext);

export const useRowSearchHighlight = (rowId?: string) => {
  const store = useContext(DiffSearchHighlightStoreContext);

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
export const useDiffSearchOptional = () =>
  useContext(DiffSearchRegistrationContext);

export const SearchHighlightedText = memo(
  ({
    text,
    ranges,
    activeRange,
  }: {
    text: string;
    ranges: TextRange[];
    activeRange: TextRange | null;
  }) => {
    if (ranges.length === 0) {
      return <>{text || " "}</>;
    }

    const nodes: ReactNode[] = [];
    let cursor = 0;

    for (const [index, range] of ranges.entries()) {
      if (range.start > cursor) {
        nodes.push(text.slice(cursor, range.start));
      }

      const isActive =
        activeRange !== null &&
        activeRange.start === range.start &&
        activeRange.end === range.end;

      nodes.push(
        <mark
          key={`${range.start}:${range.end}:${index}`}
          className={cn(
            "rounded-sm px-0 text-inherit",
            isActive
              ? "bg-[var(--diff-search-active-bg)] text-[var(--diff-search-active-fg)]"
              : "bg-[var(--diff-search-inactive-bg)] text-inherit dark:text-[var(--diff-search-active-fg)]",
          )}
        >
          {text.slice(range.start, range.end)}
        </mark>,
      );

      cursor = range.end;
    }

    if (cursor < text.length) {
      nodes.push(text.slice(cursor));
    }

    return <>{nodes}</>;
  },
);
