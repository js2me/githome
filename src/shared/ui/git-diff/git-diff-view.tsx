import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CreateDiffCommentInput,
  GitLabDiscussion,
  GitLabMergeRequestChange,
} from "@/shared/api/gitlab";
import {
  buildDeletedFileUnifiedDiff,
  buildModifiedFileUnifiedDiff,
  buildNewFileUnifiedDiff,
} from "@/shared/lib/build-synthetic-diff";
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
  getEndExpandStateKey,
  getNextExpandReveal,
  getNextExpandRevealFromEnd,
  getRevealedFromEnd,
  getRevealedFromStart,
  getVisibleLineRange,
  getVisibleLineRangeFromEnd,
  supportsExpandFromEnd,
  type DiffExpandMode,
  type DiffExpandState,
} from "@/shared/lib/expand-diff-context";
import { getDiffLineSide } from "@/shared/lib/gitlab-line-code";
import {
  getFileLevelThreadsForChange,
  indexDiffDiscussionsForChange,
} from "@/shared/lib/diff-discussions";
import {
  getDiffFileElementId,
  getDiffFileKey,
} from "@/shared/lib/diff-search";
import { parseUnifiedDiff, type DiffDisplayLine } from "@/shared/lib/parse-unified-diff";
import { StatusMessage } from "@/shared/ui/status-message";
import type { DiffFileContentLoader } from "@/shared/lib/syntax-highlight/types";
import { DiffBody } from "./virtual-diff-body";
import { DiffFileCollapseBanner } from "./diff-file-collapse-banner";
import { DiffThreadRow } from "./diff-rows";
import { DiffSearchProvider, useDiffSearchOptional } from "./diff-search";
import { DiffSyntaxHighlightProvider } from "./diff-syntax-highlight";

export type { DiffFileContentLoader };

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

const isAutoCollapsedChange = (change: GitLabMergeRequestChange) =>
  !change.diff?.trim() &&
  !change.tooLarge &&
  Boolean(change.collapsed || change.generatedFile);

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
    onResolveThread,
    resolvingDiscussionId,
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
    onResolveThread?: (discussionId: string, resolved: boolean) => void;
    resolvingDiscussionId?: string | null;
  }) => {
    const badge = getChangeBadge(change);
    const filePath = getExpandFilePath(change);
    const fileRef = change.deletedFile ? baseRef : headRef;
    const canExpand = Boolean(loadFileContent && fileRef && filePath);
    const isAutoCollapsed = isAutoCollapsedChange(change);
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
    }, [change.newPath, change.oldPath, isAutoCollapsed]);

    useEffect(() => {
      setResolvedDiff(null);
      setIsResolvingDiff(false);

      if (change.diff?.trim() || !loadFileContent || isAutoCollapsed) {
        return;
      }

      const ref = change.deletedFile ? baseRef : headRef;
      const path = change.deletedFile ? change.oldPath : change.newPath;

      if (!ref || !path || (!change.newFile && !change.deletedFile)) {
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
            change.deletedFile
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
      change.deletedFile,
      change.diff,
      change.newFile,
      change.newPath,
      change.oldPath,
      headRef,
      loadFileContent,
      isAutoCollapsed,
    ]);

    const handleExpandCollapsedFile = useCallback(async () => {
      if (change.tooLarge) {
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
        if (change.newFile && headRef) {
          const content = await loadFileContent(change.newPath, headRef);
          setExpandedDiff(buildNewFileUnifiedDiff(change.newPath, content));
        } else if (change.deletedFile && baseRef) {
          const content = await loadFileContent(change.oldPath, baseRef);
          setExpandedDiff(buildDeletedFileUnifiedDiff(change.oldPath, content));
        } else if (headRef && baseRef) {
          const [oldContent, newContent] = await Promise.all([
            loadFileContent(change.oldPath, baseRef),
            loadFileContent(change.newPath, headRef),
          ]);
          setExpandedDiff(
            buildModifiedFileUnifiedDiff(
              change.oldPath,
              change.newPath,
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
      () => shouldVirtualizeDiff(virtualRows) && commentFormLineKey === null,
      [virtualRows, commentFormLineKey],
    );

    const search = useDiffSearchOptional();
    const fileKey = getDiffFileKey(change.oldPath, change.newPath);
    const scrollToRowRef = useRef<(rowId: string) => void>(() => {});

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
      if (!search || !parsed || virtualRows.length === 0) {
        return;
      }

      if (isAutoCollapsed && !isFileExpanded) {
        return;
      }

      search.registerFile(fileKey, searchLines, (rowId) => {
        scrollToRowRef.current(rowId);
      });

      return () => search.unregisterFile(fileKey);
    }, [
      search,
      fileKey,
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
            const nextReveal = getNextExpandRevealFromEnd(gap, expandState);
            setExpandState((current) => ({
              ...current,
              [endKey]: nextReveal,
            }));
            return;
          }

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
        oldPath: change.oldPath,
        newPath: change.newPath,
        oldLine: null,
        newLine: null,
      });

      if (success) {
        handleCancelFileComment();
      }
    };

    const showTooLargeBanner =
      Boolean(change.tooLarge) &&
      !change.diff?.trim() &&
      !expandedDiff &&
      !resolvedDiff;

    return (
      <article
        id={getDiffFileElementId(fileKey)}
        className="overflow-hidden rounded-lg border border-[#dbdbdb] bg-white dark:border-[#30363d] dark:bg-gray-900"
      >
        <header className="flex items-center gap-2.5 border-b border-[#dbdbdb] bg-[#fafafa] px-3.5 py-2.5 dark:border-[#30363d] dark:bg-[#161b22]">
          {isAutoCollapsed && (
            <button
              className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-[#595959] transition hover:bg-[#ececec] dark:text-[#8b949e] dark:hover:bg-[#21262d]"
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

          {canComment && (
            <button
              className="ml-2 inline-flex h-7 items-center rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-[#0d1117] dark:text-slate-300 dark:hover:bg-slate-800"
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
          <div className="border-b border-slate-200 bg-orange-50 px-3.5 py-3 dark:border-[#30363d] dark:bg-orange-950">
            <div className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
              Комментарий к файлу
            </div>
            <textarea
              className="min-h-[72px] w-full resize-y rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-[#fc6d26] focus:shadow-[0_0_0_3px_rgba(252,109,38,0.15)] disabled:opacity-60 dark:border-orange-800 dark:bg-[#0d1117] dark:text-slate-200"
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
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-[#0d1117] dark:text-slate-300 dark:hover:bg-slate-800"
                type="button"
                disabled={isSubmittingComment}
                onClick={handleCancelFileComment}
              >
                Отмена
              </button>
              <button
                className="rounded-md bg-[#fc6d26] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#e95d1f] disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="border-b border-slate-200 dark:border-[#30363d]">
            {fileThreads.map((thread) => (
              <DiffThreadRow
                key={`file-thread:${thread.discussionId}`}
                thread={thread}
                onResolveThread={onResolveThread}
                resolvingDiscussionId={resolvingDiscussionId}
              />
            ))}
          </div>
        )}

        {showTooLargeBanner ? (
          <DiffFileCollapseBanner
            change={change}
            isLoading={false}
            onExpand={() => undefined}
          />
        ) : isAutoCollapsed && !isFileExpanded ? (
          <DiffFileCollapseBanner
            change={change}
            isLoading={isLoadingCollapsedExpand}
            onExpand={() => {
              void handleExpandCollapsedFile();
            }}
          />
        ) : parsed && virtualRows.length > 0 ? (
          <div className="overflow-x-auto">
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
              />
            </DiffSyntaxHighlightProvider>
          </div>
        ) : (
          <div className="p-3.5 text-[13px] text-slate-500">
            {isResolvingDiff
              ? "Загружаем diff..."
              : "Нет diff для этого файла."}
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
    onResolveThread,
    resolvingDiscussionId,
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
    onResolveThread?: (discussionId: string, resolved: boolean) => void;
    resolvingDiscussionId?: string | null;
  }) => {
    if (changes.length === 0) {
      return (
        <StatusMessage>Изменения в merge request не найдены.</StatusMessage>
      );
    }

    return (
      <DiffSearchProvider>
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
              onResolveThread={onResolveThread}
              resolvingDiscussionId={resolvingDiscussionId}
            />
          ))}
        </div>
      </DiffSearchProvider>
    );
  },
);
