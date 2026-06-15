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

  gaps.push({
    id: "bottom",
    direction: "down",
    hiddenCount:
      fileLineCount === null
        ? null
        : Math.max(0, fileLineCount - bottomStart + 1),
    newLineStart: bottomStart,
    newLineEnd: fileLineCount,
  });

  return gaps.filter(
    (gap) => gap.hiddenCount === null || gap.hiddenCount > 0,
  );
};

export const getRevealedLineCount = (
  gap: DiffExpandGap,
  expandState: DiffExpandState,
): number => {
  const value = expandState[gap.id];

  if (value === "all") {
    return gap.hiddenCount ?? Number.MAX_SAFE_INTEGER;
  }

  return value ?? 0;
};

export const isGapFullyExpanded = (
  gap: DiffExpandGap,
  expandState: DiffExpandState,
): boolean => {
  if (gap.hiddenCount === null) {
    return false;
  }

  const revealed = getRevealedLineCount(gap, expandState);
  return revealed >= gap.hiddenCount;
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

  const revealed = getRevealedLineCount(gap, expandState);
  const remaining = gap.hiddenCount - revealed;

  if (remaining <= 0) {
    return "all";
  }

  if (remaining <= DIFF_EXPAND_CHUNK) {
    return "all";
  }

  return revealed + DIFF_EXPAND_CHUNK;
};

export const getVisibleLineRange = (
  gap: DiffExpandGap,
  revealCount: number,
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

  return { startLine, endLine: visibleEnd };
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

export const getExpandGapLabel = (
  gap: DiffExpandGap,
  expandState: DiffExpandState,
): string => {
  const hiddenCount = gap.hiddenCount;

  if (hiddenCount === null) {
    return "Показать строки ниже";
  }

  const revealed = getRevealedLineCount(gap, expandState);
  const remaining = hiddenCount - revealed;

  if (remaining <= 0) {
    return "";
  }

  if (remaining <= DIFF_EXPAND_CHUNK) {
    return gap.direction === "up"
      ? `Показать ${remaining} ${pluralLines(remaining)} выше`
      : `Показать ${remaining} ${pluralLines(remaining)} ниже`;
  }

  return gap.direction === "up"
    ? `Показать ${DIFF_EXPAND_CHUNK} ${pluralLines(DIFF_EXPAND_CHUNK)} выше`
    : `Показать ${DIFF_EXPAND_CHUNK} ${pluralLines(DIFF_EXPAND_CHUNK)} ниже`;
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
