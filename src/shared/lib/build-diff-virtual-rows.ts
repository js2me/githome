import type { GitLabMergeRequestChange } from "@/shared/api/gitlab";
import type { DiffExpandGap, DiffExpandState } from "@/shared/lib/expand-diff-context";
import {
  getExpandGapLabel,
  isGapFullyExpanded,
} from "@/shared/lib/expand-diff-context";
import {
  getLineKeyFromDiffLine,
  type InlineDiffThread,
} from "@/shared/lib/diff-discussions";
import { computeWordDiffSegments } from "@/shared/lib/compute-word-diff";
import {
  groupDiffLinesForWordDiff,
  type DiffDisplayLine,
  type ParsedFileDiff,
} from "@/shared/lib/parse-unified-diff";

export const DIFF_LINE_HEIGHT = 20;
export const DIFF_HUNK_HEIGHT = 34;
export const DIFF_EXPAND_ROW_HEIGHT = 36;
export const DIFF_THREAD_BASE_HEIGHT = 56;
export const DIFF_THREAD_NOTE_HEIGHT = 48;
export const DIFF_COMMENT_FORM_HEIGHT = 200;
export const DIFF_VIRTUALIZE_THRESHOLD = 60;

export type VirtualDiffRow =
  | {
      type: "expand";
      id: string;
      gap: DiffExpandGap;
      label: string;
      isLoading: boolean;
      estimatedHeight: number;
    }
  | {
      type: "hunk";
      id: string;
      header: string;
      estimatedHeight: number;
    }
  | {
      type: "line";
      id: string;
      lineKey: string | null;
      line: DiffDisplayLine;
      pairedLine: DiffDisplayLine | null;
      prefix: "+" | "-" | " ";
      threadsCount: number;
      wordDiffSegments: ReturnType<typeof computeWordDiffSegments> | null;
      estimatedHeight: number;
    }
  | {
      type: "thread";
      id: string;
      lineKey: string;
      thread: InlineDiffThread;
      estimatedHeight: number;
    }
  | {
      type: "comment-form";
      id: string;
      lineKey: string;
      estimatedHeight: number;
    };

export interface DiffExpandRenderContext {
  gaps: DiffExpandGap[];
  expandState: DiffExpandState;
  contextLinesByGapId: Record<string, DiffDisplayLine[]>;
  loadingGapId: string | null;
}

const getLinePrefix = (line: DiffDisplayLine): "+" | "-" | " " => {
  if (line.type === "add") {
    return "+";
  }

  if (line.type === "delete") {
    return "-";
  }

  return " ";
};

const buildPairMap = (lines: DiffDisplayLine[]) => {
  const pairMap = new Map<DiffDisplayLine, DiffDisplayLine>();

  for (const pair of groupDiffLinesForWordDiff(lines)) {
    if (pair.deleteLine && pair.addLine) {
      pairMap.set(pair.deleteLine, pair.addLine);
      pairMap.set(pair.addLine, pair.deleteLine);
    }
  }

  return pairMap;
};

const estimateThreadHeight = (thread: InlineDiffThread) =>
  DIFF_THREAD_BASE_HEIGHT + thread.notes.length * DIFF_THREAD_NOTE_HEIGHT;

const buildWordDiffSegments = (
  line: DiffDisplayLine,
  pairedLine: DiffDisplayLine | null,
) => {
  if (
    line.type === "delete" &&
    pairedLine?.type === "add" &&
    line.text !== pairedLine.text
  ) {
    return computeWordDiffSegments(line.text, pairedLine.text, "delete");
  }

  if (
    line.type === "add" &&
    pairedLine?.type === "delete" &&
    line.text !== pairedLine.text
  ) {
    return computeWordDiffSegments(pairedLine.text, line.text, "add");
  }

  return null;
};

const pushContextLines = ({
  rows,
  change,
  hunkIndex,
  lines,
  threadIndex,
  commentFormLineKey,
  idPrefix,
}: {
  rows: VirtualDiffRow[];
  change: GitLabMergeRequestChange;
  hunkIndex: number;
  lines: DiffDisplayLine[];
  threadIndex: Map<string, InlineDiffThread[]>;
  commentFormLineKey: string | null;
  idPrefix: string;
}) => {
  const pairMap = buildPairMap(lines);

  for (const [lineIndex, line] of lines.entries()) {
    const lineKey = getLineKeyFromDiffLine(
      change.oldPath,
      change.newPath,
      line,
    );
    const pairedLine = pairMap.get(line) ?? null;
    const threads = lineKey ? (threadIndex.get(lineKey) ?? []) : [];

    rows.push({
      type: "line",
      id: `${idPrefix}:line:${hunkIndex}:${lineIndex}`,
      lineKey,
      line,
      pairedLine,
      prefix: getLinePrefix(line),
      threadsCount: threads.length,
      wordDiffSegments: buildWordDiffSegments(line, pairedLine),
      estimatedHeight: DIFF_LINE_HEIGHT,
    });

    for (const thread of threads) {
      rows.push({
        type: "thread",
        id: `thread:${thread.discussionId}`,
        lineKey: lineKey ?? "",
        thread,
        estimatedHeight: estimateThreadHeight(thread),
      });
    }

    if (lineKey && commentFormLineKey === lineKey) {
      rows.push({
        type: "comment-form",
        id: `comment-form:${lineKey}`,
        lineKey,
        estimatedHeight: DIFF_COMMENT_FORM_HEIGHT,
      });
    }
  }
};

const pushExpandGap = ({
  rows,
  gap,
  expand,
}: {
  rows: VirtualDiffRow[];
  gap: DiffExpandGap;
  expand: DiffExpandRenderContext;
}) => {
  if (isGapFullyExpanded(gap, expand.expandState)) {
    return;
  }

  const label = getExpandGapLabel(gap, expand.expandState);
  if (!label) {
    return;
  }

  rows.push({
    type: "expand",
    id: `expand:${gap.id}`,
    gap,
    label,
    isLoading: expand.loadingGapId === gap.id,
    estimatedHeight: DIFF_EXPAND_ROW_HEIGHT,
  });
};

const pushDownExpandSection = ({
  rows,
  gap,
  expand,
  change,
  hunkIndex,
  threadIndex,
  commentFormLineKey,
  idPrefix,
}: {
  rows: VirtualDiffRow[];
  gap: DiffExpandGap;
  expand: DiffExpandRenderContext;
  change: GitLabMergeRequestChange;
  hunkIndex: number;
  threadIndex: Map<string, InlineDiffThread[]>;
  commentFormLineKey: string | null;
  idPrefix: string;
}) => {
  const expandedLines = expand.contextLinesByGapId[gap.id] ?? [];

  if (expandedLines.length > 0) {
    pushContextLines({
      rows,
      change,
      hunkIndex,
      lines: expandedLines,
      threadIndex,
      commentFormLineKey,
      idPrefix,
    });
  }

  pushExpandGap({ rows, gap, expand });
};

const pushHunkLines = ({
  rows,
  change,
  hunkIndex,
  hunk,
  threadIndex,
  commentFormLineKey,
}: {
  rows: VirtualDiffRow[];
  change: GitLabMergeRequestChange;
  hunkIndex: number;
  hunk: ParsedFileDiff["hunks"][number];
  threadIndex: Map<string, InlineDiffThread[]>;
  commentFormLineKey: string | null;
}) => {
  rows.push({
    type: "hunk",
    id: `hunk:${change.newPath}:${hunkIndex}`,
    header: hunk.header,
    estimatedHeight: DIFF_HUNK_HEIGHT,
  });

  const pairMap = buildPairMap(hunk.lines);

  for (const [lineIndex, line] of hunk.lines.entries()) {
    const lineKey = getLineKeyFromDiffLine(
      change.oldPath,
      change.newPath,
      line,
    );
    const pairedLine = pairMap.get(line) ?? null;
    const threads = lineKey ? (threadIndex.get(lineKey) ?? []) : [];

    rows.push({
      type: "line",
      id: `line:${change.newPath}:${hunkIndex}:${lineIndex}`,
      lineKey,
      line,
      pairedLine,
      prefix: getLinePrefix(line),
      threadsCount: threads.length,
      wordDiffSegments: buildWordDiffSegments(line, pairedLine),
      estimatedHeight: DIFF_LINE_HEIGHT,
    });

    for (const thread of threads) {
      rows.push({
        type: "thread",
        id: `thread:${thread.discussionId}`,
        lineKey: lineKey ?? "",
        thread,
        estimatedHeight: estimateThreadHeight(thread),
      });
    }

    if (lineKey && commentFormLineKey === lineKey) {
      rows.push({
        type: "comment-form",
        id: `comment-form:${lineKey}`,
        lineKey,
        estimatedHeight: DIFF_COMMENT_FORM_HEIGHT,
      });
    }
  }
};

const getGapById = (gaps: DiffExpandGap[], id: string) =>
  gaps.find((gap) => gap.id === id) ?? null;

export const buildDiffVirtualRows = ({
  change,
  parsed,
  threadIndex,
  commentFormLineKey,
  expand,
}: {
  change: GitLabMergeRequestChange;
  parsed: ParsedFileDiff;
  threadIndex: Map<string, InlineDiffThread[]>;
  commentFormLineKey: string | null;
  expand?: DiffExpandRenderContext;
}): VirtualDiffRow[] => {
  const rows: VirtualDiffRow[] = [];
  const gaps = expand?.gaps ?? [];

  for (const [hunkIndex, hunk] of parsed.hunks.entries()) {
    if (expand) {
      if (hunkIndex === 0) {
        const topGap = getGapById(gaps, "top");
        if (topGap) {
          pushExpandGap({ rows, gap: topGap, expand });
          const topLines = expand.contextLinesByGapId.top ?? [];
          if (topLines.length > 0) {
            pushContextLines({
              rows,
              change,
              hunkIndex: -1,
              lines: topLines,
              threadIndex,
              commentFormLineKey,
              idPrefix: `expanded:top:${change.newPath}`,
            });
          }
        }
      } else {
        const betweenGap = getGapById(gaps, `between:${hunkIndex - 1}`);
        if (betweenGap) {
          const betweenLines =
            expand.contextLinesByGapId[betweenGap.id] ?? [];
          if (betweenLines.length > 0) {
            pushContextLines({
              rows,
              change,
              hunkIndex: -1,
              lines: betweenLines,
              threadIndex,
              commentFormLineKey,
              idPrefix: `expanded:${betweenGap.id}:${change.newPath}`,
            });
          }
        }
      }
    }

    pushHunkLines({
      rows,
      change,
      hunkIndex,
      hunk,
      threadIndex,
      commentFormLineKey,
    });

    if (expand && hunkIndex > 0) {
      const betweenGap = getGapById(gaps, `between:${hunkIndex - 1}`);
      if (betweenGap) {
        pushExpandGap({ rows, gap: betweenGap, expand });
      }
    }
  }

  if (expand) {
    const bottomGap = getGapById(gaps, "bottom");
    if (bottomGap) {
      pushDownExpandSection({
        rows,
        gap: bottomGap,
        expand,
        change,
        hunkIndex: parsed.hunks.length,
        threadIndex,
        commentFormLineKey,
        idPrefix: `expanded:bottom:${change.newPath}`,
      });
    }
  }

  return rows;
};

export const shouldVirtualizeDiff = (rows: VirtualDiffRow[]) =>
  rows.length >= DIFF_VIRTUALIZE_THRESHOLD;
