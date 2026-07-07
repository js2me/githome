export interface DiffSearchLineEntry {
  rowId: string;
  text: string;
}

export interface DiffSearchFileEntry {
  path: string;
  lines: DiffSearchLineEntry[];
}

export interface DiffSearchMatch {
  fileKey: string;
  rowId: string;
  start: number;
  end: number;
}

export interface TextRange {
  start: number;
  end: number;
}

export const getDiffFileKey = (oldPath: string, newPath: string) =>
  `${oldPath}\0${newPath}`;

export const getDiffFileElementId = (fileKey: string) =>
  `diff-file-${encodeURIComponent(fileKey)}`;

/** Safe `data-changes-file-id` value (file keys contain `\0`). */
export const getChangesTreeFileDataId = (fileKey: string) =>
  encodeURIComponent(fileKey);

export const getDiffFileHeaderRowId = (fileKey: string) =>
  `file-header:${fileKey}`;

export const isDiffFileHeaderRowId = (rowId: string) =>
  rowId.startsWith("file-header:");

export const findTextRanges = (text: string, query: string): TextRange[] => {
  if (!query) {
    return [];
  }

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const ranges: TextRange[] = [];
  let position = 0;

  while (position < haystack.length) {
    const index = haystack.indexOf(needle, position);
    if (index === -1) {
      break;
    }

    ranges.push({ start: index, end: index + query.length });
    position = index + needle.length;
  }

  return ranges;
};

export const collectDiffSearchMatchesForFile = (
  fileKey: string,
  { path, lines }: DiffSearchFileEntry,
  query: string,
): DiffSearchMatch[] => {
  const matches: DiffSearchMatch[] = [];
  const headerRowId = getDiffFileHeaderRowId(fileKey);

  for (const range of findTextRanges(path, query)) {
    matches.push({
      fileKey,
      rowId: headerRowId,
      start: range.start,
      end: range.end,
    });
  }

  for (const line of lines) {
    for (const range of findTextRanges(line.text, query)) {
      matches.push({
        fileKey,
        rowId: line.rowId,
        start: range.start,
        end: range.end,
      });
    }
  }

  return matches;
};

export const collectDiffSearchMatches = (
  files: Map<string, DiffSearchFileEntry>,
  query: string,
): DiffSearchMatch[] => {
  if (!query.trim()) {
    return [];
  }

  const matches: DiffSearchMatch[] = [];

  for (const [fileKey, entry] of files.entries()) {
    matches.push(...collectDiffSearchMatchesForFile(fileKey, entry, query));
  }

  return matches;
};

const DIFF_SEARCH_LINES_PER_CHUNK = 400;

const yieldToMain = (): Promise<void> => {
  const scheduler = (
    globalThis as typeof globalThis & {
      scheduler?: { yield?: () => Promise<void> };
    }
  ).scheduler;

  if (scheduler?.yield) {
    return scheduler.yield();
  }

  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
};

export const collectDiffSearchMatchesAsync = async (
  files: Map<string, DiffSearchFileEntry>,
  query: string,
  options?: {
    signal?: AbortSignal;
    onProgress?: (
      matches: DiffSearchMatch[],
      changedRowIds: readonly string[],
    ) => void;
    linesPerChunk?: number;
  },
): Promise<DiffSearchMatch[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const matches: DiffSearchMatch[] = [];
  const linesPerChunk = options?.linesPerChunk ?? DIFF_SEARCH_LINES_PER_CHUNK;
  const signal = options?.signal;

  const throwIfAborted = () => {
    if (signal?.aborted) {
      throw new DOMException("Diff search aborted", "AbortError");
    }
  };

  const reportProgress = (changedRowIds: string[]) => {
    if (changedRowIds.length === 0) {
      return;
    }

    options?.onProgress?.(matches, changedRowIds);
    changedRowIds.length = 0;
  };

  for (const [fileKey, { path, lines }] of files.entries()) {
    throwIfAborted();

    const changedRowIds: string[] = [];
    const headerRowId = getDiffFileHeaderRowId(fileKey);

    for (const range of findTextRanges(path, trimmedQuery)) {
      matches.push({
        fileKey,
        rowId: headerRowId,
        start: range.start,
        end: range.end,
      });

      if (!changedRowIds.includes(headerRowId)) {
        changedRowIds.push(headerRowId);
      }
    }

    reportProgress(changedRowIds);

    for (let offset = 0; offset < lines.length; offset += linesPerChunk) {
      throwIfAborted();

      const lineChunk = lines.slice(offset, offset + linesPerChunk);

      for (const line of lineChunk) {
        for (const range of findTextRanges(line.text, trimmedQuery)) {
          matches.push({
            fileKey,
            rowId: line.rowId,
            start: range.start,
            end: range.end,
          });

          if (!changedRowIds.includes(line.rowId)) {
            changedRowIds.push(line.rowId);
          }
        }
      }

      reportProgress(changedRowIds);
      await yieldToMain();
    }

    if (lines.length === 0) {
      await yieldToMain();
    }
  }

  return matches;
};

export const getLineSearchRanges = (
  matches: DiffSearchMatch[],
  rowId: string,
): TextRange[] =>
  matches
    .filter((match) => match.rowId === rowId)
    .map((match) => ({ start: match.start, end: match.end }));

export const indexMatchesByRowId = (
  matches: DiffSearchMatch[],
): Map<string, TextRange[]> => {
  const map = new Map<string, TextRange[]>();

  for (const match of matches) {
    const range = { start: match.start, end: match.end };
    const ranges = map.get(match.rowId);

    if (ranges) {
      ranges.push(range);
    } else {
      map.set(match.rowId, [range]);
    }
  }

  return map;
};

export const areTextRangesEqual = (left: TextRange[], right: TextRange[]) => {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftRange = left[index];
    const rightRange = right[index];

    if (
      leftRange.start !== rightRange.start ||
      leftRange.end !== rightRange.end
    ) {
      return false;
    }
  }

  return true;
};

export const isActiveSearchRange = (
  match: DiffSearchMatch | null,
  rowId: string,
  range: TextRange,
) =>
  Boolean(
    match &&
      match.rowId === rowId &&
      match.start === range.start &&
      match.end === range.end,
  );
