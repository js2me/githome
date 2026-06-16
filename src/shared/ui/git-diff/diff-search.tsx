import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import {
  collectDiffSearchMatches,
  type DiffSearchLineEntry,
  type DiffSearchMatch,
  getDiffFileElementId,
  getLineSearchRanges,
  isActiveSearchRange,
  type TextRange,
} from "@/shared/lib/diff-search";
import { cn } from "@/shared/lib/cn";

interface DiffSearchContextValue {
  query: string;
  isOpen: boolean;
  matches: DiffSearchMatch[];
  activeMatch: DiffSearchMatch | null;
  activeIndex: number;
  setQuery: (value: string) => void;
  close: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  registerFile: (
    fileKey: string,
    lines: DiffSearchLineEntry[],
    scrollToRow: (rowId: string) => void,
  ) => void;
  unregisterFile: (fileKey: string) => void;
  getRowSearchRanges: (rowId: string) => TextRange[];
  isRowRangeActive: (rowId: string, range: TextRange) => boolean;
}

const DiffSearchContext = createContext<DiffSearchContextValue | null>(null);

const DiffSearchFindBar = memo(
  ({
    query,
    activeIndex,
    matchCount,
    inputRef,
    onQueryChange,
    onClose,
    onNext,
    onPrevious,
  }: {
    query: string;
    activeIndex: number;
    matchCount: number;
    inputRef: Ref<HTMLInputElement>;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
  }) => (
    <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-[#dbdbdb] bg-[#fafafa] px-3 py-2 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
      <input
        ref={inputRef}
        className="min-w-[180px] flex-1 rounded-md border border-[#dbdbdb] bg-white px-2.5 py-1.5 font-mono text-sm text-[#303030] outline-none focus:border-[#fc6d26] focus:shadow-[0_0_0_2px_rgba(252,109,38,0.15)] dark:border-[#30363d] dark:bg-[#0d1117] dark:text-[#e6edf3]"
        placeholder="Поиск в коде..."
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
      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
        {query.trim()
          ? matchCount > 0
            ? `${activeIndex + 1} / ${matchCount}`
            : "Нет совпадений"
          : "Введите текст"}
      </span>
      <button
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-[#dbdbdb] bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#30363d] dark:bg-[#0d1117] dark:text-slate-300 dark:hover:bg-[#21262d]"
        type="button"
        title="Предыдущее (Shift+Enter)"
        disabled={matchCount === 0}
        onClick={onPrevious}
      >
        ↑
      </button>
      <button
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-[#dbdbdb] bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#30363d] dark:bg-[#0d1117] dark:text-slate-300 dark:hover:bg-[#21262d]"
        type="button"
        title="Следующее (Enter)"
        disabled={matchCount === 0}
        onClick={onNext}
      >
        ↓
      </button>
      <button
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-[#dbdbdb] bg-white text-slate-600 transition hover:bg-slate-50 dark:border-[#30363d] dark:bg-[#0d1117] dark:text-slate-300 dark:hover:bg-[#21262d]"
        type="button"
        title="Закрыть (Esc)"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  ),
);

export const DiffSearchProvider = memo(({ children }: { children: ReactNode }) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [registryVersion, setRegistryVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileLinesRef = useRef<Map<string, DiffSearchLineEntry[]>>(new Map());
  const scrollHandlersRef = useRef<Map<string, (rowId: string) => void>>(new Map());

  const matches = useMemo(() => {
    void registryVersion;
    return collectDiffSearchMatches(fileLinesRef.current, query);
  }, [query, registryVersion]);

  const activeMatch = matches[activeIndex] ?? null;

  const scrollToActiveMatch = useCallback(
    (match: DiffSearchMatch | null) => {
      if (!match) {
        return;
      }

      document
        .getElementById(getDiffFileElementId(match.fileKey))
        ?.scrollIntoView({ block: "nearest" });

      requestAnimationFrame(() => {
        scrollHandlersRef.current.get(match.fileKey)?.(match.rowId);
      });
    },
    [],
  );

  const goToMatch = useCallback(
    (index: number) => {
      if (matches.length === 0) {
        return;
      }

      const normalizedIndex =
        ((index % matches.length) + matches.length) % matches.length;
      setActiveIndex(normalizedIndex);
      scrollToActiveMatch(matches[normalizedIndex] ?? null);
    },
    [matches, scrollToActiveMatch],
  );

  const goToNext = useCallback(() => {
    goToMatch(activeIndex + 1);
  }, [activeIndex, goToMatch]);

  const goToPrevious = useCallback(() => {
    goToMatch(activeIndex - 1);
  }, [activeIndex, goToMatch]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (matches.length > 0) {
      scrollToActiveMatch(matches[activeIndex] ?? matches[0] ?? null);
    }
  }, [activeIndex, matches, scrollToActiveMatch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isFindShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f";

      if (isFindShortcut) {
        event.preventDefault();
        open();
        return;
      }

      if (!isOpen) {
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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, goToNext, goToPrevious, isOpen, open]);

  const registerFile = useCallback(
    (
      fileKey: string,
      lines: DiffSearchLineEntry[],
      scrollToRow: (rowId: string) => void,
    ) => {
      fileLinesRef.current.set(fileKey, lines);
      scrollHandlersRef.current.set(fileKey, scrollToRow);
      setRegistryVersion((value) => value + 1);
    },
    [],
  );

  const unregisterFile = useCallback((fileKey: string) => {
    fileLinesRef.current.delete(fileKey);
    scrollHandlersRef.current.delete(fileKey);
    setRegistryVersion((value) => value + 1);
  }, []);

  const value = useMemo<DiffSearchContextValue>(
    () => ({
      query,
      isOpen,
      matches,
      activeMatch,
      activeIndex,
      setQuery,
      close,
      goToNext,
      goToPrevious,
      registerFile,
      unregisterFile,
      getRowSearchRanges: (rowId: string) => getLineSearchRanges(matches, rowId),
      isRowRangeActive: (rowId: string, range: TextRange) =>
        isActiveSearchRange(activeMatch, rowId, range),
    }),
    [
      activeIndex,
      activeMatch,
      close,
      goToNext,
      goToPrevious,
      isOpen,
      matches,
      query,
      registerFile,
      unregisterFile,
    ],
  );

  return (
    <DiffSearchContext.Provider value={value}>
      {isOpen && (
        <DiffSearchFindBar
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
      {children}
    </DiffSearchContext.Provider>
  );
});

export const useDiffSearch = () => {
  const context = useContext(DiffSearchContext);
  if (!context) {
    throw new Error("useDiffSearch must be used within DiffSearchProvider");
  }

  return context;
};

export const useDiffSearchOptional = () => useContext(DiffSearchContext);

export const SearchHighlightedText = memo(
  ({
    text,
    ranges,
    isRangeActive,
  }: {
    text: string;
    ranges: TextRange[];
    isRangeActive: (range: TextRange) => boolean;
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

      nodes.push(
        <mark
          key={`${range.start}:${range.end}:${index}`}
          className={cn(
            "rounded-sm px-0 text-inherit",
            isRangeActive(range)
              ? "bg-[#ff9632] text-[#1f2328] dark:bg-[#9e6a03] dark:text-[#f0f6fc]"
              : "bg-[#fff8c5] text-inherit dark:bg-[#6e5a1f] dark:text-[#f0f6fc]",
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
