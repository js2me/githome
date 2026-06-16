import type { DiffDisplayLine, DiffHunk, ParsedFileDiff } from "./parse-unified-diff";

export const DIFF_EXPAND_CHUNK = 20;

export interface DiffHunkLineRange {
  newStart: number;
  newEnd: number;
  oldStart: number;
  oldEnd: number;
}

export interface DiffExpandGap {
  id: string;
  direction: "up" | "down";
  hiddenCount: number | null;
  newLineStart: number;
  newLineEnd: number | null;
}

export type DiffExpandState = Record<string, number | "all">;

export type DiffExpandMode = "chunk-down" | "chunk-up" | "all";

export const getEndExpandStateKey = (gapId: string) => `${gapId}:end`;

export const supportsExpandFromEnd = (gap: DiffExpandGap) =>
  gap.id.startsWith("between:") || gap.id === "bottom";

export const getHunkLineRanges = (hunks: DiffHunk[]): DiffHunkLineRange[] =>
  hunks.map((hunk) => {
    const newEnd = hunk.endingNewLine - 1;
    const newStart = hunk.newStart;

    let oldStart = Number.POSITIVE_INFINITY;
    let oldEnd = 0;

    for (const line of hunk.lines) {
      if (line.oldLine !== null) {
        oldStart = Math.min(oldStart, line.oldLine);
        oldEnd = Math.max(oldEnd, line.oldLine);
      }
    }

    const headerMatch = hunk.header.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (headerMatch && oldStart === Number.POSITIVE_INFINITY) {
      oldStart = Number.parseInt(headerMatch[1], 10);
      oldEnd = oldStart;
    }

    if (oldStart === Number.POSITIVE_INFINITY) {
      oldStart = 1;
    }

    return {
      newStart,
      newEnd: Math.max(newEnd, newStart - 1),
      oldStart,
      oldEnd: Math.max(oldEnd, oldStart),
    };
  });

export const getDiffExpandGaps = (
  parsed: ParsedFileDiff,
  fileLineCount: number | null,
): DiffExpandGap[] => {
  const hunks = parsed.hunks;
  if (hunks.length === 0) {
    return [];
  }

  const gaps: DiffExpandGap[] = [];
  const firstHunk = hunks[0];

  if (firstHunk.newStart > 1) {
    gaps.push({
      id: "top",
      direction: "up",
      hiddenCount: firstHunk.newStart - 1,
      newLineStart: 1,
      newLineEnd: firstHunk.newStart - 1,
    });
  }

  for (let index = 0; index < hunks.length - 1; index += 1) {
    const current = hunks[index];
    const next = hunks[index + 1];
    const gapStart = current.endingNewLine;
    const gapEnd = next.newStart - 1;

    if (gapEnd >= gapStart) {
      gaps.push({
        id: `between:${index}`,
        direction: "down",
        hiddenCount: gapEnd - gapStart + 1,
        newLineStart: gapStart,
        newLineEnd: gapEnd,
      });
    }
  }

  const lastHunk = hunks[hunks.length - 1];
  const bottomStart = lastHunk.endingNewLine;

  if (fileLineCount !== null) {
    const hiddenBelow = fileLineCount - bottomStart + 1;

    if (hiddenBelow > 0) {
      gaps.push({
        id: "bottom",
        direction: "down",
        hiddenCount: hiddenBelow,
        newLineStart: bottomStart,
        newLineEnd: fileLineCount,
      });
    }
  }

  return gaps.filter(
    (gap) => gap.hiddenCount === null || gap.hiddenCount > 0,
  );
};

export const getRevealedFromStart = (
  gap: DiffExpandGap,
  expandState: DiffExpandState,
): number => {
  const value = expandState[gap.id];

  if (value === "all") {
    return gap.hiddenCount ?? Number.MAX_SAFE_INTEGER;
  }

  return typeof value === "number" ? value : 0;
};

export const getRevealedFromEnd = (
  gap: DiffExpandGap,
  expandState: DiffExpandState,
): number => {
  if (expandState[gap.id] === "all") {
    return 0;
  }

  const value = expandState[getEndExpandStateKey(gap.id)];
  return typeof value === "number" ? value : 0;
};

/** @deprecated use getRevealedFromStart */
export const getRevealedLineCount = (
  gap: DiffExpandGap,
  expandState: DiffExpandState,
): number => getRevealedFromStart(gap, expandState);

export const getRemainingHiddenCount = (
  gap: DiffExpandGap,
  expandState: DiffExpandState,
): number => {
  if (gap.hiddenCount === null) {
    return 0;
  }

  if (expandState[gap.id] === "all") {
    return 0;
  }

  const fromStart = getRevealedFromStart(gap, expandState);
  const fromEnd = supportsExpandFromEnd(gap)
    ? getRevealedFromEnd(gap, expandState)
    : 0;
  const overlap = Math.max(0, fromStart + fromEnd - gap.hiddenCount);

  return Math.max(0, gap.hiddenCount - fromStart - fromEnd + overlap);
};

export const isGapFullyExpanded = (
  gap: DiffExpandGap,
  expandState: DiffExpandState,
): boolean => getRemainingHiddenCount(gap, expandState) <= 0;

const getNextChunkReveal = (revealed: number, remaining: number) => {
  if (remaining <= 0) {
    return "all" as const;
  }

  if (remaining <= DIFF_EXPAND_CHUNK) {
    return "all" as const;
  }

  return revealed + DIFF_EXPAND_CHUNK;
};

export const getNextExpandReveal = (
  gap: DiffExpandGap,
  expandState: DiffExpandState,
): number | "all" => {
  if (gap.hiddenCount === null) {
    const current = expandState[gap.id];
    if (typeof current === "number") {
      return current + DIFF_EXPAND_CHUNK;
    }

    return DIFF_EXPAND_CHUNK;
  }

  const revealed = getRevealedFromStart(gap, expandState);
  const fromEnd = supportsExpandFromEnd(gap)
    ? getRevealedFromEnd(gap, expandState)
    : 0;
  const overlap = Math.max(0, revealed + fromEnd - gap.hiddenCount);
  const remaining = gap.hiddenCount - revealed - fromEnd + overlap;

  return getNextChunkReveal(revealed, remaining);
};

export const getNextExpandRevealFromEnd = (
  gap: DiffExpandGap,
  expandState: DiffExpandState,
): number | "all" => {
  if (gap.hiddenCount === null) {
    const current = expandState[getEndExpandStateKey(gap.id)];
    if (typeof current === "number") {
      return current + DIFF_EXPAND_CHUNK;
    }

    return DIFF_EXPAND_CHUNK;
  }

  const revealed = getRevealedFromEnd(gap, expandState);
  const fromStart = getRevealedFromStart(gap, expandState);
  const overlap = Math.max(0, fromStart + revealed - gap.hiddenCount);
  const remaining = gap.hiddenCount - fromStart - revealed + overlap;

  return getNextChunkReveal(revealed, remaining);
};

export const getVisibleLineRange = (
  gap: DiffExpandGap,
  revealCount: number,
  expandState: DiffExpandState = {},
): { startLine: number; endLine: number } | null => {
  if (gap.newLineEnd === null && gap.direction === "down") {
    return {
      startLine: gap.newLineStart,
      endLine: gap.newLineStart + revealCount - 1,
    };
  }

  const endLine = gap.newLineEnd ?? gap.newLineStart;

  if (gap.direction === "up") {
    const startLine = Math.max(gap.newLineStart, endLine - revealCount + 1);
    return { startLine, endLine };
  }

  const startLine = gap.newLineStart;
  const visibleEnd = Math.min(endLine, startLine + revealCount - 1);

  if (visibleEnd < startLine) {
    return null;
  }

  const fromEnd = supportsExpandFromEnd(gap)
    ? getRevealedFromEnd(gap, expandState)
    : 0;
  const maxEndLine =
    gap.newLineEnd !== null ? gap.newLineEnd - fromEnd : visibleEnd;

  return { startLine, endLine: Math.min(visibleEnd, maxEndLine) };
};

export const getVisibleLineRangeFromEnd = (
  gap: DiffExpandGap,
  revealCount: number,
  expandState: DiffExpandState,
): { startLine: number; endLine: number } | null => {
  const endLine = gap.newLineEnd ?? gap.newLineStart;
  const fromStart = getRevealedFromStart(gap, expandState);
  const minStartLine = gap.newLineStart + fromStart;
  const startLine = Math.max(minStartLine, endLine - revealCount + 1);

  if (startLine > endLine) {
    return null;
  }

  return { startLine, endLine };
};

export const buildContextLines = (
  fileLines: string[],
  startLine: number,
  endLine: number,
): DiffDisplayLine[] => {
  const lines: DiffDisplayLine[] = [];

  for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
    const text = fileLines[lineNumber - 1] ?? "";
    lines.push({
      type: "context",
      text,
      oldLine: lineNumber,
      newLine: lineNumber,
    });
  }

  return lines;
};

export const getChunkExpandTooltip = (
  direction: "up" | "down",
  expandState: DiffExpandState,
  gap: DiffExpandGap,
): string => {
  const remaining = getRemainingHiddenCount(gap, expandState);
  const count = Math.min(DIFF_EXPAND_CHUNK, remaining);

  if (count <= 0) {
    return direction === "up" ? "Показать строки выше" : "Показать строки ниже";
  }

  const lines = pluralLines(count);
  return direction === "up"
    ? `Показать ${count} ${lines} выше`
    : `Показать ${count} ${lines} ниже`;
};

const pluralLines = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return "строку";
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return "строки";
  }

  return "строк";
};
