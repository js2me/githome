import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CreateDiffCommentInput,
  GitLabDiscussion,
  GitLabMergeRequestChange,
} from "@/shared/api/gitlab";
import {
  buildDiffVirtualRows,
  shouldVirtualizeDiff,
} from "@/shared/lib/build-diff-virtual-rows";
import { cn } from "@/shared/lib/cn";
import type { DiffLineSelection } from "@/shared/lib/diff-line-selection";
import {
  getLineFromVirtualRows,
  getOrderedCommentableLineKeys,
  getSelectionEndKey,
  getSelectionLineRangeLabel,
  isMultiLineSelection,
  normalizeDiffLineSelection,
} from "@/shared/lib/diff-line-selection";
import {
  buildContextLines,
  getDiffExpandGaps,
  getNextExpandReveal,
  getRevealedLineCount,
  getVisibleLineRange,
  type DiffExpandState,
} from "@/shared/lib/expand-diff-context";
import { getDiffLineSide } from "@/shared/lib/gitlab-line-code";
import { indexDiffDiscussions } from "@/shared/lib/diff-discussions";
import { parseUnifiedDiff, type DiffDisplayLine } from "@/shared/lib/parse-unified-diff";
import { StatusMessage } from "@/shared/ui/status-message";
import { DiffBody } from "./virtual-diff-body";

export type DiffFileContentLoader = (
  filePath: string,
  ref: string,
) => Promise<string>;

const getChangePath = (change: GitLabMergeRequestChange) => {
  if (change.renamedFile && change.oldPath !== change.newPath) {
    return `${change.oldPath} → ${change.newPath}`;
  }

  return change.newPath;
};

const getChangeBadge = (change: GitLabMergeRequestChange) => {
  if (change.newFile) {
    return "new";
  }

  if (change.deletedFile) {
    return "deleted";
  }

  if (change.renamedFile) {
    return "renamed";
  }

  return null;
};

const badgeClasses: Record<string, string> = {
  new: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  deleted: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
  renamed: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

const getExpandFilePath = (change: GitLabMergeRequestChange) => {
  if (change.deletedFile) {
    return change.oldPath;
  }

  return change.newPath;
};

const GitDiffFile = memo(
  ({
    change,
    discussions,
    canComment,
    isSubmittingComment,
    submitCommentError,
    onAddComment,
    onClearSubmitError,
    headRef,
    baseRef,
    loadFileContent,
  }: {
    change: GitLabMergeRequestChange;
    discussions: GitLabDiscussion[];
    canComment: boolean;
    isSubmittingComment: boolean;
    submitCommentError: string | null;
    onAddComment: (input: CreateDiffCommentInput) => Promise<boolean>;
    onClearSubmitError: () => void;
    headRef: string | null;
    baseRef: string | null;
    loadFileContent?: DiffFileContentLoader;
  }) => {
    const badge = getChangeBadge(change);
    const filePath = getExpandFilePath(change);
    const fileRef = change.deletedFile ? baseRef : headRef;
    const canExpand = Boolean(loadFileContent && fileRef && filePath);

    const parsed = useMemo(
      () => (change.diff ? parseUnifiedDiff(change.diff) : null),
      [change.diff],
    );

    const threadIndex = useMemo(
      () => indexDiffDiscussions(discussions),
      [discussions],
    );

    const [lineSelection, setLineSelection] = useState<DiffLineSelection | null>(
      null,
    );
    const [selectionAnchorKey, setSelectionAnchorKey] = useState<string | null>(
      null,
    );
    const [commentBody, setCommentBody] = useState("");
    const [expandState, setExpandState] = useState<DiffExpandState>({});
    const [loadingGapId, setLoadingGapId] = useState<string | null>(null);
    const [fileLineCount, setFileLineCount] = useState<number | null>(null);
    const [fileCacheVersion, setFileCacheVersion] = useState(0);
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);

    const fileLinesCacheRef = useRef<Map<string, string[]>>(new Map());
    const dragMovedRef = useRef(false);

    const getFileLines = useCallback(async () => {
      if (!loadFileContent || !fileRef) {
        return [];
      }

      const cacheKey = `${fileRef}:${filePath}`;
      const cached = fileLinesCacheRef.current.get(cacheKey);
      if (cached) {
        return cached;
      }

      const content = await loadFileContent(filePath, fileRef);
      const lines = content.split("\n");
      fileLinesCacheRef.current.set(cacheKey, lines);
      setFileLineCount(lines.length);
      setFileCacheVersion((value) => value + 1);
      return lines;
    }, [filePath, fileRef, loadFileContent]);

    const expandGaps = useMemo(() => {
      if (!parsed || !canExpand) {
        return [];
      }

      return getDiffExpandGaps(parsed, fileLineCount);
    }, [parsed, canExpand, fileLineCount]);

    const contextLinesByGapId = useMemo(() => {
      void fileCacheVersion;

      if (!canExpand || !fileRef) {
        return {};
      }

      const cacheKey = `${fileRef}:${filePath}`;
      const fileLines = fileLinesCacheRef.current.get(cacheKey);
      if (!fileLines) {
        return {};
      }

      const result: Record<string, DiffDisplayLine[]> = {};

      for (const gap of expandGaps) {
        const revealCount = getRevealedLineCount(gap, expandState);
        if (revealCount <= 0) {
          continue;
        }

        const range = getVisibleLineRange(gap, revealCount);
        if (!range) {
          continue;
        }

        const endLine = Math.min(range.endLine, fileLines.length);
        if (endLine < range.startLine) {
          continue;
        }

        result[gap.id] = buildContextLines(fileLines, range.startLine, endLine);
      }

      return result;
    }, [canExpand, expandGaps, expandState, fileCacheVersion, filePath, fileRef]);

    const baseVirtualRows = useMemo(() => {
      if (!parsed) {
        return [];
      }

      return buildDiffVirtualRows({
        change,
        parsed,
        threadIndex,
        commentFormLineKey: null,
        expand: canExpand
          ? {
              gaps: expandGaps,
              expandState,
              contextLinesByGapId,
              loadingGapId,
            }
          : undefined,
      });
    }, [
      change,
      parsed,
      threadIndex,
      canExpand,
      expandGaps,
      expandState,
      contextLinesByGapId,
      loadingGapId,
    ]);

    const orderedLineKeys = useMemo(
      () => getOrderedCommentableLineKeys(baseVirtualRows),
      [baseVirtualRows],
    );

    const commentFormLineKey = useMemo(() => {
      if (!lineSelection) {
        return null;
      }

      return getSelectionEndKey(lineSelection, orderedLineKeys);
    }, [lineSelection, orderedLineKeys]);

    const virtualRows = useMemo(() => {
      if (!parsed) {
        return [];
      }

      return buildDiffVirtualRows({
        change,
        parsed,
        threadIndex,
        commentFormLineKey,
        expand: canExpand
          ? {
              gaps: expandGaps,
              expandState,
              contextLinesByGapId,
              loadingGapId,
            }
          : undefined,
      });
    }, [
      change,
      parsed,
      threadIndex,
      commentFormLineKey,
      canExpand,
      expandGaps,
      expandState,
      contextLinesByGapId,
      loadingGapId,
    ]);

    const selectionRangeLabel = useMemo(() => {
      if (!lineSelection) {
        return null;
      }

      return getSelectionLineRangeLabel(
        lineSelection,
        baseVirtualRows,
        orderedLineKeys,
      );
    }, [lineSelection, baseVirtualRows, orderedLineKeys]);

    const virtualized = useMemo(
      () => shouldVirtualizeDiff(virtualRows),
      [virtualRows],
    );

    const handleExpandGap = useCallback(
      async (gapId: string) => {
        if (!canExpand) {
          return;
        }

        const gap = expandGaps.find((item) => item.id === gapId);
        if (!gap) {
          return;
        }

        setLoadingGapId(gapId);

        try {
          await getFileLines();
          const nextReveal = getNextExpandReveal(gap, expandState);
          setExpandState((current) => ({
            ...current,
            [gapId]: nextReveal,
          }));
        } finally {
          setLoadingGapId(null);
        }
      },
      [canExpand, expandGaps, expandState, getFileLines],
    );

    const clearSelection = useCallback(() => {
      setLineSelection(null);
      setSelectionAnchorKey(null);
      setCommentBody("");
      onClearSubmitError();
    }, [onClearSubmitError]);

    const applyLineSelection = useCallback(
      (lineKey: string, shiftKey: boolean) => {
        if (!canComment) {
          return;
        }

        if (
          !shiftKey &&
          lineSelection &&
          lineSelection.startKey === lineKey &&
          lineSelection.endKey === lineKey
        ) {
          clearSelection();
          return;
        }

        const anchorKey = shiftKey ? (selectionAnchorKey ?? lineKey) : lineKey;
        const nextSelection = normalizeDiffLineSelection(
          anchorKey,
          lineKey,
          orderedLineKeys,
        );

        setLineSelection(nextSelection);
        setSelectionAnchorKey(anchorKey);
        setCommentBody("");
        onClearSubmitError();
      },
      [
        canComment,
        clearSelection,
        lineSelection,
        onClearSubmitError,
        orderedLineKeys,
        selectionAnchorKey,
      ],
    );

    const handleLineClick = useCallback(
      (lineKey: string, shiftKey: boolean) => {
        if (dragMovedRef.current) {
          dragMovedRef.current = false;
          return;
        }

        applyLineSelection(lineKey, shiftKey);
      },
      [applyLineSelection],
    );

    const handleLineMouseDown = useCallback(
      (lineKey: string) => {
        if (!canComment) {
          return;
        }

        dragMovedRef.current = false;
        setIsDraggingSelection(true);
        setSelectionAnchorKey(lineKey);
        setLineSelection({ startKey: lineKey, endKey: lineKey });
        setCommentBody("");
        onClearSubmitError();
      },
      [canComment, onClearSubmitError],
    );

    const handleLineMouseEnter = useCallback(
      (lineKey: string) => {
        if (!isDraggingSelection || !selectionAnchorKey) {
          return;
        }

        dragMovedRef.current = true;
        setLineSelection(
          normalizeDiffLineSelection(
            selectionAnchorKey,
            lineKey,
            orderedLineKeys,
          ),
        );
      },
      [isDraggingSelection, orderedLineKeys, selectionAnchorKey],
    );

    useEffect(() => {
      if (!isDraggingSelection) {
        return;
      }

      const handleMouseUp = () => {
        setIsDraggingSelection(false);
      };

      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [isDraggingSelection]);

    const handleCancelComment = () => {
      clearSelection();
    };

    const handleSubmitComment = async () => {
      if (!lineSelection) {
        return;
      }

      const normalized = normalizeDiffLineSelection(
        lineSelection.startKey,
        lineSelection.endKey,
        orderedLineKeys,
      );
      const endLine = getLineFromVirtualRows(baseVirtualRows, normalized.endKey);
      const startLine = getLineFromVirtualRows(
        baseVirtualRows,
        normalized.startKey,
      );

      if (!endLine) {
        return;
      }

      const input: CreateDiffCommentInput = {
        body: commentBody,
        oldPath: change.oldPath,
        newPath: change.newPath,
        oldLine: endLine.oldLine,
        newLine: endLine.newLine,
      };

      if (
        startLine &&
        isMultiLineSelection(lineSelection, orderedLineKeys)
      ) {
        input.lineRange = {
          start: {
            oldLine: startLine.oldLine,
            newLine: startLine.newLine,
            type: getDiffLineSide(startLine),
          },
          end: {
            oldLine: endLine.oldLine,
            newLine: endLine.newLine,
            type: getDiffLineSide(endLine),
          },
        };
      }

      const success = await onAddComment(input);

      if (success) {
        handleCancelComment();
      }
    };

    return (
      <article className="overflow-hidden rounded-lg border border-[#dbdbdb] bg-white dark:border-[#30363d] dark:bg-gray-900">
        <header className="flex items-center gap-2.5 border-b border-[#dbdbdb] bg-[#fafafa] px-3.5 py-2.5 dark:border-[#30363d] dark:bg-[#161b22]">
          <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold text-[#303030] dark:text-[#e6edf3]">
            {getChangePath(change)}
          </span>

          {parsed && (parsed.additions > 0 || parsed.deletions > 0) && (
            <span className="flex shrink-0 items-center gap-2 font-mono text-xs font-bold">
              {parsed.additions > 0 && (
                <span className="text-[#1f883d] dark:text-[#3fb950]">
                  +{parsed.additions}
                </span>
              )}
              {parsed.deletions > 0 && (
                <span className="text-[#c9190b] dark:text-[#ff7b72]">
                  −{parsed.deletions}
                </span>
              )}
            </span>
          )}

          {badge && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
                badgeClasses[badge],
              )}
            >
              {badge}
            </span>
          )}
        </header>

        {parsed && virtualRows.length > 0 ? (
          <div className="overflow-x-auto">
            <DiffBody
              rows={virtualRows}
              virtualized={virtualized}
              canComment={canComment}
              lineSelection={lineSelection}
              orderedLineKeys={orderedLineKeys}
              commentFormLineKey={commentFormLineKey}
              commentBody={commentBody}
              submitError={submitCommentError}
              isSubmitting={isSubmittingComment}
              selectionRangeLabel={selectionRangeLabel}
              onLineClick={handleLineClick}
              onLineMouseDown={handleLineMouseDown}
              onLineMouseEnter={handleLineMouseEnter}
              onCommentBodyChange={setCommentBody}
              onCancelComment={handleCancelComment}
              onSubmitComment={handleSubmitComment}
              onExpandGap={canExpand ? handleExpandGap : undefined}
            />
          </div>
        ) : (
          <div className="p-3.5 text-[13px] text-slate-500">
            Нет diff для этого файла.
          </div>
        )}
      </article>
    );
  },
);

export const GitDiffView = memo(
  ({
    changes,
    discussions,
    canComment,
    isSubmittingComment,
    submitCommentError,
    onAddComment,
    onClearSubmitError,
    headRef,
    baseRef,
    loadFileContent,
  }: {
    changes: GitLabMergeRequestChange[];
    discussions: GitLabDiscussion[];
    canComment: boolean;
    isSubmittingComment: boolean;
    submitCommentError: string | null;
    onAddComment: (input: CreateDiffCommentInput) => Promise<boolean>;
    onClearSubmitError: () => void;
    headRef?: string | null;
    baseRef?: string | null;
    loadFileContent?: DiffFileContentLoader;
  }) => {
    if (changes.length === 0) {
      return (
        <StatusMessage>Изменения в merge request не найдены.</StatusMessage>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {changes.map((change) => (
          <GitDiffFile
            key={`${change.newPath}:${change.oldPath}`}
            change={change}
            discussions={discussions}
            canComment={canComment}
            isSubmittingComment={isSubmittingComment}
            submitCommentError={submitCommentError}
            onAddComment={onAddComment}
            onClearSubmitError={onClearSubmitError}
            headRef={headRef ?? null}
            baseRef={baseRef ?? null}
            loadFileContent={loadFileContent}
          />
        ))}
      </div>
    );
  },
);
