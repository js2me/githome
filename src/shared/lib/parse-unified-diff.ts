export type DiffLineType = "context" | "add" | "delete" | "no-newline";

export interface DiffDisplayLine {
  type: DiffLineType;
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface DiffHunk {
  header: string;
  lines: DiffDisplayLine[];
  /** First new-side line number in this hunk (from @@ header). */
  newStart: number;
  /** First new-side line number after this hunk (exclusive). */
  endingNewLine: number;
}

export interface ParsedFileDiff {
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

const HUNK_HEADER_RE = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/;

export const parseUnifiedDiff = (raw: string): ParsedFileDiff => {
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;
  let additions = 0;
  let deletions = 0;

  const pushCurrentHunk = () => {
    if (!currentHunk) {
      return;
    }

    currentHunk.endingNewLine = newLine;
    hunks.push(currentHunk);
    currentHunk = null;
  };

  for (const line of raw.split("\n")) {
    if (line.startsWith("---") || line.startsWith("+++")) {
      continue;
    }

    if (line.startsWith("@@")) {
      pushCurrentHunk();

      const match = line.match(HUNK_HEADER_RE);
      const headerNewStart = match ? Number.parseInt(match[2], 10) : 1;
      if (match) {
        oldLine = Number.parseInt(match[1], 10);
        newLine = headerNewStart;
      }

      currentHunk = {
        header: line,
        lines: [],
        newStart: headerNewStart,
        endingNewLine: headerNewStart,
      };
      continue;
    }

    if (!currentHunk) {
      continue;
    }

    if (line.startsWith("\\")) {
      currentHunk.lines.push({
        type: "no-newline",
        text: line,
        oldLine: null,
        newLine: null,
      });
      continue;
    }

    const prefix = line[0];
    const text = line.slice(1);

    if (prefix === " ") {
      currentHunk.lines.push({
        type: "context",
        text,
        oldLine,
        newLine,
      });
      oldLine += 1;
      newLine += 1;
      continue;
    }

    if (prefix === "-") {
      currentHunk.lines.push({
        type: "delete",
        text,
        oldLine,
        newLine: null,
      });
      oldLine += 1;
      deletions += 1;
      continue;
    }

    if (prefix === "+") {
      currentHunk.lines.push({
        type: "add",
        text,
        oldLine: null,
        newLine,
      });
      newLine += 1;
      additions += 1;
    }
  }

  pushCurrentHunk();

  return { hunks, additions, deletions };
};

export interface DiffLinePair {
  deleteLine: DiffDisplayLine | null;
  addLine: DiffDisplayLine | null;
}

export const groupDiffLinesForWordDiff = (
  lines: DiffDisplayLine[],
): DiffLinePair[] => {
  const result: DiffLinePair[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.type !== "delete" && line.type !== "add") {
      result.push({ deleteLine: null, addLine: null });
      index += 1;
      continue;
    }

    const deleteLines: DiffDisplayLine[] = [];
    const addLines: DiffDisplayLine[] = [];

    while (index < lines.length && lines[index].type === "delete") {
      deleteLines.push(lines[index]);
      index += 1;
    }

    while (index < lines.length && lines[index].type === "add") {
      addLines.push(lines[index]);
      index += 1;
    }

    const pairCount = Math.max(deleteLines.length, addLines.length);

    for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
      result.push({
        deleteLine: deleteLines[pairIndex] ?? null,
        addLine: addLines[pairIndex] ?? null,
      });
    }
  }

  return result;
};
