import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import type { DiffExpandGap, DiffExpandState } from "@/shared/lib/expand-diff-context";
import {
  getEndExpandStateKey,
  shouldEmbedHunkHeaderInExpandBar,
  shouldShowGapExpandBar,
} from "@/shared/lib/expand-diff-context";
import {
  collectThreadsForLine,
  getLineKeyFromDiffLine,
  getOrphanThreadsForChange,
  type InlineDiffThread,
} from "@/shared/lib/gitlab/diff-discussions";
import { computeWordDiffSegments } from "@/shared/lib/compute-word-diff";
import {
  groupDiffLinesForWordDiff,
  type DiffDisplayLine,
  type ParsedFileDiff,
} from "@/shared/lib/parse-unified-diff";

export const DIFF_LINE_HEIGHT = 20;
export const DIFF_HUNK_HEIGHT = 34;
export const DIFF_EXPAND_ROW_HEIGHT = 28;
export const DIFF_COLLAPSED_HUNK_ROW_HEIGHT = 44;
export const DIFF_THREAD_BASE_HEIGHT = 56;
export const DIFF_THREAD_NOTE_HEIGHT = 48;
export const DIFF_COMMENT_FORM_HEIGHT = 200;
export const DIFF_VIRTUALIZE_THRESHOLD = 60;

export type VirtualDiffRow =
  | {
      type: "expand";
      id: string;
      gap: DiffExpandGap;
      expandState: DiffExpandState;
      isLoading: boolean;
      hunkHeader?: string;
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

const pushLineWithThreads = ({
  rows,
  change,
  line,
  pairedLine,
  lineKey,
  threads,
  commentFormLineKey,
  id,
  hunkIndex,
  lineIndex,
  idPrefix,
  placedDiscussionIds,
}: {
  rows: VirtualDiffRow[];
  change: GitLabMergeRequestChangeDC;
  line: DiffDisplayLine;
  pairedLine: DiffDisplayLine | null;
  lineKey: string | null;
  threads: InlineDiffThread[];
  commentFormLineKey: string | null;
  id?: string;
  hunkIndex?: number;
  lineIndex: number;
  idPrefix?: string;
  placedDiscussionIds: Set<string>;
}) => {
  rows.push({
    type: "line",
    id:
      id ??
      `${idPrefix ?? `line:${change.new_path}:${hunkIndex}`}:line:${hunkIndex}:${lineIndex}`,
    lineKey,
    line,
    pairedLine,
    prefix: getLinePrefix(line),
    threadsCount: threads.length,
    wordDiffSegments: buildWordDiffSegments(line, pairedLine),
    estimatedHeight: DIFF_LINE_HEIGHT,
  });

  for (const thread of threads) {
    if (placedDiscussionIds.has(thread.discussionId)) {
      continue;
    }

    placedDiscussionIds.add(thread.discussionId);
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
};

const pushContextLines = ({
  rows,
  change,
  hunkIndex,
  lines,
  threadIndex,
  commentFormLineKey,
  idPrefix,
  placedDiscussionIds,
}: {
  rows: VirtualDiffRow[];
  change: GitLabMergeRequestChangeDC;
  hunkIndex: number;
  lines: DiffDisplayLine[];
  threadIndex: Map<string, InlineDiffThread[]>;
  commentFormLineKey: string | null;
  idPrefix: string;
  placedDiscussionIds: Set<string>;
}) => {
  const pairMap = buildPairMap(lines);

  for (const [lineIndex, line] of lines.entries()) {
    const lineKey = getLineKeyFromDiffLine(
      change.old_path,
      change.new_path,
      line,
    );
    const pairedLine = pairMap.get(line) ?? null;
    const threads = collectThreadsForLine(
      change.old_path,
      change.new_path,
      line,
      threadIndex,
    );

    pushLineWithThreads({
      rows,
      change,
      line,
      pairedLine,
      lineKey,
      threads,
      commentFormLineKey,
      id: `${idPrefix}:line:${hunkIndex}:${lineIndex}`,
      hunkIndex,
      lineIndex,
      idPrefix,
      placedDiscussionIds,
    });
  }
};

const pushExpandGap = ({
  rows,
  gap,
  expand,
  hunkHeader,
}: {
  rows: VirtualDiffRow[];
  gap: DiffExpandGap;
  expand: DiffExpandRenderContext;
  hunkHeader?: string;
}) => {
  if (
    !shouldShowGapExpandBar(
      gap,
      expand.expandState,
      expand.contextLinesByGapId,
    )
  ) {
    return;
  }

  const isCollapsedHunk = Boolean(hunkHeader);

  rows.push({
    type: "expand",
    id: `expand:${gap.id}`,
    gap,
    expandState: expand.expandState,
    isLoading: expand.loadingGapId === gap.id,
    hunkHeader,
    estimatedHeight: isCollapsedHunk
      ? DIFF_COLLAPSED_HUNK_ROW_HEIGHT
      : DIFF_EXPAND_ROW_HEIGHT,
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
  placedDiscussionIds,
}: {
  rows: VirtualDiffRow[];
  gap: DiffExpandGap;
  expand: DiffExpandRenderContext;
  change: GitLabMergeRequestChangeDC;
  hunkIndex: number;
  threadIndex: Map<string, InlineDiffThread[]>;
  commentFormLineKey: string | null;
  idPrefix: string;
  placedDiscussionIds: Set<string>;
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
      placedDiscussionIds,
    });
  }

  pushExpandGap({ rows, gap, expand });

  const expandedEndLines =
    expand.contextLinesByGapId[getEndExpandStateKey(gap.id)] ?? [];

  if (expandedEndLines.length > 0) {
    pushContextLines({
      rows,
      change,
      hunkIndex,
      lines: expandedEndLines,
      threadIndex,
      commentFormLineKey,
      idPrefix: `${idPrefix}:end`,
      placedDiscussionIds,
    });
  }
};

const pushHunkLines = ({
  rows,
  change,
  hunkIndex,
  hunk,
  threadIndex,
  commentFormLineKey,
  placedDiscussionIds,
  skipHeader = false,
}: {
  rows: VirtualDiffRow[];
  change: GitLabMergeRequestChangeDC;
  hunkIndex: number;
  hunk: ParsedFileDiff["hunks"][number];
  threadIndex: Map<string, InlineDiffThread[]>;
  commentFormLineKey: string | null;
  placedDiscussionIds: Set<string>;
  skipHeader?: boolean;
}) => {
  if (!skipHeader) {
    rows.push({
      type: "hunk",
      id: `hunk:${change.new_path}:${hunkIndex}`,
      header: hunk.header,
      estimatedHeight: DIFF_HUNK_HEIGHT,
    });
  }

  const pairMap = buildPairMap(hunk.lines);

  for (const [lineIndex, line] of hunk.lines.entries()) {
    const lineKey = getLineKeyFromDiffLine(
      change.old_path,
      change.new_path,
      line,
    );
    const pairedLine = pairMap.get(line) ?? null;
    const threads = collectThreadsForLine(
      change.old_path,
      change.new_path,
      line,
      threadIndex,
    );

    pushLineWithThreads({
      rows,
      change,
      line,
      pairedLine,
      lineKey,
      threads,
      commentFormLineKey,
      id: `line:${change.new_path}:${hunkIndex}:${lineIndex}`,
      hunkIndex,
      lineIndex,
      placedDiscussionIds,
    });
  }
};

const pushOrphanThreads = ({
  rows,
  threadIndex,
  placedDiscussionIds,
}: {
  rows: VirtualDiffRow[];
  threadIndex: Map<string, InlineDiffThread[]>;
  placedDiscussionIds: Set<string>;
}) => {
  for (const thread of getOrphanThreadsForChange(
    threadIndex,
    placedDiscussionIds,
  )) {
    placedDiscussionIds.add(thread.discussionId);
    rows.push({
      type: "thread",
      id: `thread:${thread.discussionId}`,
      lineKey: "",
      thread,
      estimatedHeight: estimateThreadHeight(thread),
    });
  }
};

const getGapById = (gaps: DiffExpandGap[], id: string) =>
  gaps.find((gap) => gap.id === id) ?? null;

const getGapHunkRenderFlags = (
  gap: DiffExpandGap,
  expand: DiffExpandRenderContext,
) => {
  const showExpandBar = shouldShowGapExpandBar(
    gap,
    expand.expandState,
    expand.contextLinesByGapId,
  );

  return {
    showExpandBar,
    embedHunkHeader: shouldEmbedHunkHeaderInExpandBar(
      gap,
      expand.expandState,
      expand.contextLinesByGapId,
    ),
    // Hunk header lives only inside a collapsed expand bar, never as a separate row.
    skipHunkHeader: true,
  };
};

export const buildDiffVirtualRows = ({
  change,
  parsed,
  threadIndex,
  commentFormLineKey,
  expand,
}: {
  change: GitLabMergeRequestChangeDC;
  parsed: ParsedFileDiff;
  threadIndex: Map<string, InlineDiffThread[]>;
  commentFormLineKey: string | null;
  expand?: DiffExpandRenderContext;
}): VirtualDiffRow[] => {
  const rows: VirtualDiffRow[] = [];
  const placedDiscussionIds = new Set<string>();
  const gaps = expand?.gaps ?? [];

  for (const [hunkIndex, hunk] of parsed.hunks.entries()) {
    if (expand) {
      if (hunkIndex === 0) {
        const topGap = getGapById(gaps, "top");
        if (topGap) {
          const { embedHunkHeader, skipHunkHeader } = getGapHunkRenderFlags(
            topGap,
            expand,
          );

          const topStartLines = expand.contextLinesByGapId.top ?? [];
          if (topStartLines.length > 0) {
            pushContextLines({
              rows,
              change,
              hunkIndex: -1,
              lines: topStartLines,
              threadIndex,
              commentFormLineKey,
              idPrefix: `expanded:top:${change.new_path}`,
              placedDiscussionIds,
            });
          }

          pushExpandGap({
            rows,
            gap: topGap,
            expand,
            hunkHeader: embedHunkHeader ? hunk.header : undefined,
          });

          const topEndLines =
            expand.contextLinesByGapId[getEndExpandStateKey("top")] ?? [];
          if (topEndLines.length > 0) {
            pushContextLines({
              rows,
              change,
              hunkIndex: -1,
              lines: topEndLines,
              threadIndex,
              commentFormLineKey,
              idPrefix: `expanded:${getEndExpandStateKey("top")}:${change.new_path}`,
              placedDiscussionIds,
            });
          }

          pushHunkLines({
            rows,
            change,
            hunkIndex,
            hunk,
            threadIndex,
            commentFormLineKey,
            skipHeader: skipHunkHeader,
            placedDiscussionIds,
          });
          continue;
        }
      } else {
        const betweenGap = getGapById(gaps, `between:${hunkIndex - 1}`);
        let skipHunkHeader = false;
        let embedHunkHeader = false;

        if (betweenGap) {
          const flags = getGapHunkRenderFlags(betweenGap, expand);
          skipHunkHeader = flags.skipHunkHeader;
          embedHunkHeader = flags.embedHunkHeader;

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
              idPrefix: `expanded:${betweenGap.id}:${change.new_path}`,
              placedDiscussionIds,
            });
          }

          pushExpandGap({
            rows,
            gap: betweenGap,
            expand,
            hunkHeader: embedHunkHeader ? hunk.header : undefined,
          });

          const betweenEndLines =
            expand.contextLinesByGapId[getEndExpandStateKey(betweenGap.id)] ??
            [];
          if (betweenEndLines.length > 0) {
            pushContextLines({
              rows,
              change,
              hunkIndex: -1,
              lines: betweenEndLines,
              threadIndex,
              commentFormLineKey,
              idPrefix: `expanded:${getEndExpandStateKey(betweenGap.id)}:${change.new_path}`,
              placedDiscussionIds,
            });
          }
        }

        pushHunkLines({
          rows,
          change,
          hunkIndex,
          hunk,
          threadIndex,
          commentFormLineKey,
          skipHeader: skipHunkHeader,
          placedDiscussionIds,
        });
        continue;
      }
    }

    pushHunkLines({
      rows,
      change,
      hunkIndex,
      hunk,
      threadIndex,
      commentFormLineKey,
      placedDiscussionIds,
    });
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
        idPrefix: `expanded:bottom:${change.new_path}`,
        placedDiscussionIds,
      });
    }
  }

  pushOrphanThreads({ rows, threadIndex, placedDiscussionIds });

  return rows;
};

export const shouldVirtualizeDiff = (rows: VirtualDiffRow[]) =>
  rows.length >= DIFF_VIRTUALIZE_THRESHOLD;
