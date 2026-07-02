import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  GitLabDiscussionDC,
  GitLabMergeRequestChangeDC,
} from "@/shared/api/gitlab";
import type { CreateDiffCommentInput } from "@/shared/lib/gitlab/diff-comment";
import {
  buildDeletedFileUnifiedDiff,
  buildModifiedFileUnifiedDiff,
  buildNewFileUnifiedDiff,
} from "@/shared/lib/build-synthetic-diff";
import {
  buildDiffVirtualRows,
} from "@/shared/lib/build-diff-virtual-rows";
import { cn } from "@/shared/lib/cn";
import { cva } from "yummies/css";
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
  getEndExpandStateKey,
  getNextExpandReveal,
  getNextExpandRevealFromEnd,
  getRevealedFromEnd,
  getRevealedFromStart,
  getVisibleLineRange,
  getVisibleLineRangeFromEnd,
  isGapClosedByContext,
  isGapFullyExpanded,
  supportsExpandFromEnd,
  type DiffExpandMode,
  type DiffExpandState,
} from "@/shared/lib/expand-diff-context";
import { getDiffLineSide } from "@/shared/lib/gitlab/line-code";
import {
  getFileLevelThreadsForChange,
  indexDiffDiscussionsForChange,
} from "@/shared/lib/gitlab/diff-discussions";
import { isAutoCollapsedMergeRequestChange } from "@/shared/lib/gitlab/merge-request-changes-visibility";
import {
  getDiffFileElementId,
  getDiffFileHeaderRowId,
  getDiffFileKey,
} from "@/shared/lib/diff-search";
import { parseUnifiedDiff, type DiffDisplayLine } from "@/shared/lib/parse-unified-diff";
import type { DiffFileContentLoader } from "@/shared/lib/syntax-highlight/types";
import { DiffFileCollapseBanner } from "./diff-file-collapse-banner";
import { DiffThreadRow } from "./diff-rows";
import { SearchHighlightedText, useDiffSearchRegistrationOptional, useRowSearchHighlight } from "./diff-search";
import { DiffSyntaxHighlightProvider } from "./diff-syntax-highlight";
import { DiffBody } from "./virtual-diff-body";
import { DiffFileCopyButton } from "./diff-file-copy-button";
import { CopyContentIcon } from "./icons/copy-content-icon";
import { CopyNameIcon } from "./icons/copy-name-icon";
import { CopyPathIcon } from "./icons/copy-path-icon";

const getChangePath = (change: GitLabMergeRequestChangeDC) => {
  if (change.renamed_file && change.old_path !== change.new_path) {
    return `${change.old_path} → ${change.new_path}`;
  }

  return change.new_path;
};

const getChangeBadge = (change: GitLabMergeRequestChangeDC) => {
  if (change.new_file) {
    return "new";
  }

  if (change.deleted_file) {
    return "deleted";
  }

  if (change.renamed_file) {
    return "renamed";
  }

  return null;
};

const diffFileBadgeVariants = cva(
  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
  {
    variants: {
      badge: {
        new: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
        deleted: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
        renamed: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      },
    },
  },
);

const getExpandFilePath = (change: GitLabMergeRequestChangeDC) => {
  if (change.deleted_file) {
    return change.old_path;
  }

  return change.new_path;
};

const getFileNameFromPath = (path: string) => path.split("/").pop() ?? path;

const diffFileHeaderTextButtonVariants = cva(
  "inline-flex h-7 cursor-pointer items-center rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800",
);

export const GitDiffFile = memo(
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
    onResolveThread,
    resolvingDiscussionId,
    currentUserId,
    onUpdateDiscussionNote,
    updatingNoteKey,
    updateNoteError,
    onClearUpdateNoteError,
    isActive,
    onActiveFileChange,
  }: {
    change: GitLabMergeRequestChangeDC;
    discussions: GitLabDiscussionDC[];
    canComment: boolean;
    isSubmittingComment: boolean;
    submitCommentError: string | null;
    onAddComment: (input: CreateDiffCommentInput) => Promise<boolean>;
    onClearSubmitError: () => void;
    headRef: string | null;
    baseRef: string | null;
    loadFileContent?: DiffFileContentLoader;
    onResolveThread?: (discussionId: string, resolved: boolean) => void;
    resolvingDiscussionId?: string | null;
    currentUserId?: number | null;
    onUpdateDiscussionNote?: (
      discussionId: string,
      noteId: number,
      body: string,
    ) => Promise<boolean>;
    updatingNoteKey?: string | null;
    updateNoteError?: string | null;
    onClearUpdateNoteError?: () => void;
    isActive?: boolean;
    onActiveFileChange?: (fileKey: string) => void;
  }) => {
    const badge = getChangeBadge(change);
    const filePath = getExpandFilePath(change);
    const fileRef = change.deleted_file ? baseRef : headRef;
    const canExpand = Boolean(loadFileContent && fileRef && filePath);
    const isAutoCollapsed = isAutoCollapsedMergeRequestChange(change);
    const [isFileExpanded, setIsFileExpanded] = useState(!isAutoCollapsed);
    const [expandedDiff, setExpandedDiff] = useState<string | null>(null);
    const [isLoadingCollapsedExpand, setIsLoadingCollapsedExpand] =
      useState(false);
    const [resolvedDiff, setResolvedDiff] = useState<string | null>(null);
    const [isResolvingDiff, setIsResolvingDiff] = useState(false);

    const effectiveDiff =
      change.diff || expandedDiff || resolvedDiff || "";

    useEffect(() => {
      setIsFileExpanded(!isAutoCollapsed);
      setExpandedDiff(null);
      setExpandState({});
      setLoadingGapId(null);
    }, [change.new_path, change.old_path, isAutoCollapsed]);

    useEffect(() => {
      setResolvedDiff(null);
      setIsResolvingDiff(false);

      if (change.diff?.trim() || !loadFileContent || isAutoCollapsed) {
        return;
      }

      const ref = change.deleted_file ? baseRef : headRef;
      const path = change.deleted_file ? change.old_path : change.new_path;

      if (!ref || !path || (!change.new_file && !change.deleted_file)) {
        return;
      }

      let cancelled = false;
      setIsResolvingDiff(true);

      void loadFileContent(path, ref)
        .then((content) => {
          if (cancelled) {
            return;
          }

          setResolvedDiff(
            change.deleted_file
              ? buildDeletedFileUnifiedDiff(path, content)
              : buildNewFileUnifiedDiff(path, content),
          );
        })
        .catch(() => {
          if (!cancelled) {
            setResolvedDiff(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsResolvingDiff(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [
      baseRef,
      change.deleted_file,
      change.diff,
      change.new_file,
      change.new_path,
      change.old_path,
      headRef,
      loadFileContent,
      isAutoCollapsed,
    ]);

    const handleExpandCollapsedFile = useCallback(async () => {
      if (change.too_large) {
        return;
      }

      if (change.diff?.trim()) {
        setIsFileExpanded(true);
        return;
      }

      if (!loadFileContent) {
        return;
      }

      setIsLoadingCollapsedExpand(true);

      try {
        if (change.new_file && headRef) {
          const content = await loadFileContent(change.new_path, headRef);
          setExpandedDiff(buildNewFileUnifiedDiff(change.new_path, content));
        } else if (change.deleted_file && baseRef) {
          const content = await loadFileContent(change.old_path, baseRef);
          setExpandedDiff(buildDeletedFileUnifiedDiff(change.old_path, content));
        } else if (headRef && baseRef) {
          const [oldContent, newContent] = await Promise.all([
            loadFileContent(change.old_path, baseRef),
            loadFileContent(change.new_path, headRef),
          ]);
          setExpandedDiff(
            buildModifiedFileUnifiedDiff(
              change.old_path,
              change.new_path,
              oldContent,
              newContent,
            ),
          );
        }

        setIsFileExpanded(true);
      } finally {
        setIsLoadingCollapsedExpand(false);
      }
    }, [baseRef, change, headRef, loadFileContent]);

    useEffect(() => {
      if (
        change.generated_file ||
        change.too_large ||
        change.diff?.trim() ||
        !loadFileContent ||
        expandedDiff ||
        resolvedDiff ||
        change.new_file ||
        change.deleted_file
      ) {
        return;
      }

      void handleExpandCollapsedFile();
    }, [
      change.deleted_file,
      change.diff,
      change.generated_file,
      change.new_file,
      change.new_path,
      change.old_path,
      change.too_large,
      expandedDiff,
      handleExpandCollapsedFile,
      loadFileContent,
      resolvedDiff,
    ]);

    const parsed = useMemo(
      () => (effectiveDiff ? parseUnifiedDiff(effectiveDiff) : null),
      [effectiveDiff],
    );

    const threadIndex = useMemo(
      () => indexDiffDiscussionsForChange(discussions, change),
      [discussions, change],
    );
    const fileThreads = useMemo(
      () => getFileLevelThreadsForChange(discussions, change),
      [discussions, change],
    );

    const [lineSelection, setLineSelection] = useState<DiffLineSelection | null>(
      null,
    );
    const [selectionAnchorKey, setSelectionAnchorKey] = useState<string | null>(
      null,
    );
    const [commentBody, setCommentBody] = useState("");
    const [isFileCommentOpen, setIsFileCommentOpen] = useState(false);
    const [fileCommentBody, setFileCommentBody] = useState("");
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
        setFileLineCount(cached.length);
        return cached;
      }

      const content = await loadFileContent(filePath, fileRef);
      const lines = content.split("\n");
      if (lines.length > 0 && lines[lines.length - 1] === "") {
        lines.pop();
      }
      fileLinesCacheRef.current.set(cacheKey, lines);
      setFileLineCount(lines.length);
      setFileCacheVersion((value) => value + 1);
      return lines;
    }, [filePath, fileRef, loadFileContent]);

    useEffect(() => {
      if (!canExpand || !parsed) {
        return;
      }

      void getFileLines();
    }, [canExpand, parsed, getFileLines]);

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
        if (expandState[gap.id] === "all") {
          const revealCount = gap.hiddenCount ?? 0;
          if (revealCount <= 0) {
            continue;
          }

          const range = getVisibleLineRange(gap, revealCount, expandState);
          if (!range) {
            continue;
          }

          const endLine = Math.min(range.endLine, fileLines.length);
          if (endLine < range.startLine) {
            continue;
          }

          result[gap.id] = buildContextLines(
            fileLines,
            range.startLine,
            endLine,
          );
          continue;
        }

        const startReveal = getRevealedFromStart(gap, expandState);
        if (startReveal > 0) {
          const range = getVisibleLineRange(gap, startReveal, expandState);
          if (range) {
            const endLine = Math.min(range.endLine, fileLines.length);
            if (endLine >= range.startLine) {
              result[gap.id] = buildContextLines(
                fileLines,
                range.startLine,
                endLine,
              );
            }
          }
        }

        if (supportsExpandFromEnd(gap)) {
          const endReveal = getRevealedFromEnd(gap, expandState);
          if (endReveal > 0) {
            const range = getVisibleLineRangeFromEnd(
              gap,
              endReveal,
              expandState,
            );
            if (range) {
              const endLine = Math.min(range.endLine, fileLines.length);
              if (endLine >= range.startLine) {
                result[getEndExpandStateKey(gap.id)] = buildContextLines(
                  fileLines,
                  range.startLine,
                  endLine,
                );
              }
            }
          }
        }

        const gapFullyOpen =
          isGapFullyExpanded(gap, expandState) ||
          isGapClosedByContext(gap, result);

        if (
          gapFullyOpen &&
          gap.newLineEnd !== null &&
          gap.hiddenCount !== null &&
          gap.hiddenCount > 0
        ) {
          result[gap.id] = buildContextLines(
            fileLines,
            gap.newLineStart,
            Math.min(gap.newLineEnd, fileLines.length),
          );
          delete result[getEndExpandStateKey(gap.id)];
        }
      }

      return result;
    }, [canExpand, expandGaps, expandState, fileCacheVersion, filePath, fileRef]);

    useEffect(() => {
      if (!canExpand || expandGaps.length === 0) {
        return;
      }

      const gapsToNormalize = expandGaps.filter(
        (gap) =>
          expandState[gap.id] !== "all" &&
          isGapClosedByContext(gap, contextLinesByGapId),
      );

      if (gapsToNormalize.length === 0) {
        return;
      }

      setExpandState((current) => {
        let changed = false;
        const next = { ...current };

        for (const gap of gapsToNormalize) {
          if (next[gap.id] === "all") {
            continue;
          }

          next[gap.id] = "all";
          delete next[getEndExpandStateKey(gap.id)];
          changed = true;
        }

        return changed ? next : current;
      });
    }, [canExpand, contextLinesByGapId, expandGaps, expandState]);

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

    // Per-file viewport virtualization uses an inner scroll container.
    // Render the full diff and rely on the page scroll instead (GitLab-style).
    const virtualized = false;

    const searchRegistration = useDiffSearchRegistrationOptional();
    const registerFile = searchRegistration?.registerFile;
    const unregisterFile = searchRegistration?.unregisterFile;
    const fileKey = getDiffFileKey(change.old_path, change.new_path);
    const searchFilePath = useMemo(() => getChangePath(change), [change]);
    const copyFileContent = useCallback(async () => {
      if (!loadFileContent || !fileRef) {
        return effectiveDiff;
      }

      return loadFileContent(filePath, fileRef);
    }, [effectiveDiff, filePath, fileRef, loadFileContent]);
    const headerRowId = getDiffFileHeaderRowId(fileKey);
    const headerSearchHighlight = useRowSearchHighlight(headerRowId);
    const scrollToRowRef = useRef<(rowId: string) => void>(() => { });

    const searchLines = useMemo(
      () =>
        virtualRows
          .filter((row) => row.type === "line")
          .map((row) => ({
            rowId: row.id,
            text: row.line.text,
          })),
      [virtualRows],
    );

    const handleRegisterScrollToRow = useCallback(
      (scrollToRow: (rowId: string) => void) => {
        scrollToRowRef.current = scrollToRow;
      },
      [],
    );

    useEffect(() => {
      if (!registerFile || !unregisterFile) {
        return;
      }

      const includeCodeLines =
        Boolean(parsed) &&
        virtualRows.length > 0 &&
        !(isAutoCollapsed && !isFileExpanded);

      registerFile(
        fileKey,
        searchFilePath,
        includeCodeLines ? searchLines : [],
        (rowId) => {
          scrollToRowRef.current(rowId);
        },
      );

      return () => unregisterFile(fileKey);
    }, [
      registerFile,
      unregisterFile,
      fileKey,
      searchFilePath,
      searchLines,
      parsed,
      virtualRows.length,
      isAutoCollapsed,
      isFileExpanded,
    ]);

    const handleExpandGap = useCallback(
      async (gapId: string, mode: DiffExpandMode) => {
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

          if (mode === "all") {
            setExpandState((current) => {
              const next = { ...current, [gapId]: "all" as const };
              delete next[getEndExpandStateKey(gapId)];
              return next;
            });
            return;
          }

          if (mode === "chunk-up" && supportsExpandFromEnd(gap)) {
            const endKey = getEndExpandStateKey(gapId);
            setExpandState((current) => {
              const nextReveal = getNextExpandRevealFromEnd(gap, current);
              const next = { ...current, [endKey]: nextReveal };

              if (isGapFullyExpanded(gap, next)) {
                next[gapId] = "all";
                delete next[endKey];
              }

              return next;
            });
            return;
          }

          setExpandState((current) => {
            const nextReveal = getNextExpandReveal(gap, current);
            const next = { ...current, [gapId]: nextReveal };

            if (isGapFullyExpanded(gap, next)) {
              next[gapId] = "all";
              delete next[getEndExpandStateKey(gapId)];
            }

            return next;
          });
        } finally {
          setLoadingGapId(null);
        }
      },
      [canExpand, expandGaps, getFileLines],
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
        oldPath: change.old_path,
        newPath: change.new_path,
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

    const handleCancelFileComment = () => {
      setIsFileCommentOpen(false);
      setFileCommentBody("");
      onClearSubmitError();
    };

    const handleSubmitFileComment = async () => {
      if (!fileCommentBody.trim()) {
        return;
      }

      const success = await onAddComment({
        body: fileCommentBody.trim(),
        oldPath: change.old_path,
        newPath: change.new_path,
        oldLine: null,
        newLine: null,
      });

      if (success) {
        handleCancelFileComment();
      }
    };

    const showTooLargeBanner =
      Boolean(change.too_large) &&
      !change.diff?.trim() &&
      !expandedDiff &&
      !resolvedDiff;

    const renderDiffContent = () => {
      if (showTooLargeBanner) {
        return (
          <DiffFileCollapseBanner
            change={change}
            isLoading={false}
            onExpand={() => undefined}
          />
        );
      }

      if (isAutoCollapsed && !isFileExpanded) {
        return (
          <DiffFileCollapseBanner
            change={change}
            isLoading={isLoadingCollapsedExpand}
            onExpand={() => {
              void handleExpandCollapsedFile();
            }}
          />
        );
      }

      if (parsed && virtualRows.length > 0) {
        return (
          <DiffSyntaxHighlightProvider change={change} parsed={parsed}>
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
              onRegisterScrollToRow={handleRegisterScrollToRow}
              onResolveThread={onResolveThread}
              resolvingDiscussionId={resolvingDiscussionId}
              currentUserId={currentUserId}
              onUpdateDiscussionNote={onUpdateDiscussionNote}
              updatingNoteKey={updatingNoteKey}
              updateNoteError={updateNoteError}
              onClearUpdateNoteError={onClearUpdateNoteError}
            />
          </DiffSyntaxHighlightProvider>
        );
      }

      return (
        <div className="p-3.5 text-[13px] text-slate-500">
          {isResolvingDiff || isLoadingCollapsedExpand
            ? "Загружаем diff..."
            : "Нет diff для этого файла."}
        </div>
      );
    };

    return (
      <article
        id={getDiffFileElementId(fileKey)}
        className={cn(
          "w-max min-w-full rounded-lg border bg-white dark:bg-gray-900",
          isActive
            ? "border-accent-blue ring-2 ring-[var(--color-accent-blue-ring)] dark:border-accent-blue"
            : "border-[var(--diff-border)]",
        )}
        onClickCapture={(event) => {
          const target = event.target as HTMLElement;
          if (
            target.closest("button, a, input, textarea, select, label")
          ) {
            return;
          }

          onActiveFileChange?.(fileKey);
        }}
      >
        <header className="sticky top-0 z-10 flex items-center gap-2.5 rounded-t-lg border-b border-[var(--diff-border)] bg-[var(--diff-header-bg)] px-3.5 py-2.5">
          {isAutoCollapsed && (
            <button
              className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--color-fg-subtle)] transition hover:bg-[var(--color-accent-emphasis-hover)] dark:text-[var(--color-fg-muted)] dark:hover:bg-[var(--color-canvas-muted)]"
              type="button"
              title={isFileExpanded ? "Свернуть файл" : "Развернуть файл"}
              aria-label={isFileExpanded ? "Свернуть файл" : "Развернуть файл"}
              onClick={() => {
                if (isFileExpanded) {
                  setIsFileExpanded(false);
                  return;
                }

                void handleExpandCollapsedFile();
              }}
            >
              <svg
                aria-hidden="true"
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  isFileExpanded && "rotate-90",
                )}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 4l4 4-4 4" />
              </svg>
            </button>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-0.5">
            <span className="min-w-0 truncate font-mono text-[13px] text-[var(--diff-code-text)]">
              {headerSearchHighlight.ranges.length > 0 ? (
                <SearchHighlightedText
                  text={searchFilePath}
                  ranges={headerSearchHighlight.ranges}
                  activeRange={headerSearchHighlight.activeRange}
                />
              ) : (
                searchFilePath
              )}
            </span>
            <div className="flex shrink-0 items-center">
              <DiffFileCopyButton
                compact
                label="копировать путь"
                icon={<CopyPathIcon />}
                getValue={() => filePath}
              />
              <DiffFileCopyButton
                compact
                label="копировать имя"
                icon={<CopyNameIcon />}
                getValue={() => getFileNameFromPath(filePath)}
              />
            </div>
          </div>

          {parsed && (parsed.additions > 0 || parsed.deletions > 0) && (
            <span className="flex shrink-0 items-center gap-2 font-mono text-xs font-bold">
              {parsed.additions > 0 && (
                <span className="text-[var(--diff-stats-added)]">
                  +{parsed.additions}
                </span>
              )}
              {parsed.deletions > 0 && (
                <span className="text-[var(--diff-stats-removed)]">
                  −{parsed.deletions}
                </span>
              )}
            </span>
          )}

          {badge && (
            <span className={diffFileBadgeVariants({ badge })}>
              {badge}
            </span>
          )}

          <div className="ml-2 flex shrink-0 items-center">
            <DiffFileCopyButton
              label="копировать содержимое"
              icon={<CopyContentIcon />}
              getValue={copyFileContent}
            />
          </div>

          {canComment && (
            <button
              className={diffFileHeaderTextButtonVariants()}
              type="button"
              onClick={() => {
                setIsFileCommentOpen((value) => !value);
                setLineSelection(null);
                setSelectionAnchorKey(null);
              }}
            >
              {isFileCommentOpen ? "Скрыть комментарий" : "Комментарий к файлу"}
            </button>
          )}
        </header>

        {isFileCommentOpen && (
          <div className="border-b border-slate-200 bg-orange-50 px-3.5 py-3 dark:border-[var(--color-border-default)] dark:bg-orange-950">
            <div className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
              Комментарий к файлу
            </div>
            <textarea
              className="min-h-[72px] w-full resize-y rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-focus-shadow)] disabled:opacity-60 dark:border-orange-800 dark:bg-canvas-default dark:text-slate-200"
              placeholder="Оставьте комментарий к файлу"
              value={fileCommentBody}
              disabled={isSubmittingComment}
              onChange={(event) => setFileCommentBody(event.target.value)}
            />
            {submitCommentError && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-300">
                {submitCommentError}
              </div>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800"
                type="button"
                disabled={isSubmittingComment}
                onClick={handleCancelFileComment}
              >
                Отмена
              </button>
              <button
                className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={isSubmittingComment || !fileCommentBody.trim()}
                onClick={handleSubmitFileComment}
              >
                Отправить
              </button>
            </div>
          </div>
        )}

        {fileThreads.length > 0 && (
          <div className="border-b border-slate-200 dark:border-[var(--color-border-default)]">
            {fileThreads.map((thread) => (
              <DiffThreadRow
                key={`file-thread:${thread.discussionId}`}
                thread={thread}
                onResolveThread={onResolveThread}
                resolvingDiscussionId={resolvingDiscussionId}
                placement="file"
                currentUserId={currentUserId}
                onUpdateNote={onUpdateDiscussionNote}
                updatingNoteKey={updatingNoteKey}
                updateNoteError={updateNoteError}
                onClearUpdateNoteError={onClearUpdateNoteError}
              />
            ))}
          </div>
        )}

        {renderDiffContent()}
      </article>
    );
  },
);
