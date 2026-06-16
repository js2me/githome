export interface DiffSearchLineEntry {
  rowId: string;
  text: string;
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

export const collectDiffSearchMatches = (
  fileLines: Map<string, DiffSearchLineEntry[]>,
  query: string,
): DiffSearchMatch[] => {
  if (!query.trim()) {
    return [];
  }

  const matches: DiffSearchMatch[] = [];

  for (const [fileKey, lines] of fileLines.entries()) {
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
