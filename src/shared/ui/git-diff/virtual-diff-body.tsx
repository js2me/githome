import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { VirtualDiffRow } from "@/shared/lib/build-diff-virtual-rows";
import type { DiffExpandMode } from "@/shared/lib/expand-diff-context";
import type { DiffLineSelection } from "@/shared/lib/diff-line-selection";
import {
  isLineKeyInSelection,
  normalizeDiffLineSelection,
} from "@/shared/lib/diff-line-selection";
import {
  DiffCommentFormRow,
  DiffExpandRow,
  DiffHunkRow,
  DiffLineRow,
  DiffThreadRow,
} from "./diff-rows";

const getLineSelectionFlags = (
  lineKey: string | null,
  selectedLineKeys: Set<string>,
  selectionStartKey: string | null,
  selectionEndKey: string | null,
) => {
  if (!lineKey || selectedLineKeys.size === 0) {
    return {
      isSelected: false,
      isSelectionStart: false,
      isSelectionEnd: false,
    };
  }

  return {
    isSelected: selectedLineKeys.has(lineKey),
    isSelectionStart: lineKey === selectionStartKey,
    isSelectionEnd: lineKey === selectionEndKey,
  };
};

const isDiffCodeRow = (row: VirtualDiffRow) =>
  row.type === "line" || row.type === "hunk" || row.type === "expand";

const getDiffRowLayoutClassName = (row: VirtualDiffRow) =>
  isDiffCodeRow(row) ? "w-full min-w-max" : "w-full min-w-0 max-w-full";

type DiffThreadResolveProps = {
  onResolveThread?: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId?: string | null;
};

const VirtualDiffRowView = memo(
  ({
    row,
    canComment,
    selectedLineKeys,
    selectionStartKey,
    selectionEndKey,
    commentBody,
    submitError,
    isSubmitting,
    selectionRangeLabel,
    onLineClick,
    onLineMouseDown,
    onLineMouseEnter,
    onCommentBodyChange,
    onCancelComment,
    onSubmitComment,
    onExpandGap,
    onResolveThread,
    resolvingDiscussionId,
  }: {
    row: VirtualDiffRow;
    canComment: boolean;
    selectedLineKeys: Set<string>;
    selectionStartKey: string | null;
    selectionEndKey: string | null;
    commentBody: string;
    submitError: string | null;
    isSubmitting: boolean;
    selectionRangeLabel: string | null;
    onLineClick: (lineKey: string, shiftKey: boolean) => void;
    onLineMouseDown: (lineKey: string) => void;
    onLineMouseEnter: (lineKey: string) => void;
    onCommentBodyChange: (value: string) => void;
    onCancelComment: () => void;
    onSubmitComment: () => void;
    onExpandGap?: (gapId: string, mode: DiffExpandMode) => void;
  } & DiffThreadResolveProps) => {
    if (row.type === "expand") {
      return (
        <DiffExpandRow
          gap={row.gap}
          expandState={row.expandState}
          isLoading={row.isLoading}
          onExpand={(gap, mode) => onExpandGap?.(gap.id, mode)}
        />
      );
    }

    if (row.type === "hunk") {
      return <DiffHunkRow header={row.header} />;
    }

    if (row.type === "line") {
      const selectionFlags = getLineSelectionFlags(
        row.lineKey,
        selectedLineKeys,
        selectionStartKey,
        selectionEndKey,
      );

      return (
        <DiffLineRow
          line={row.line}
          prefix={row.prefix}
          lineKey={row.lineKey}
          rowId={row.id}
          canComment={canComment}
          hasThreads={row.threadsCount > 0}
          isSelected={selectionFlags.isSelected}
          isSelectionStart={selectionFlags.isSelectionStart}
          isSelectionEnd={selectionFlags.isSelectionEnd}
          wordDiffSegments={row.wordDiffSegments}
          onCommentClick={(shiftKey) => {
            if (row.lineKey) {
              onLineClick(row.lineKey, shiftKey);
            }
          }}
          onLineMouseDown={() => {
            if (row.lineKey) {
              onLineMouseDown(row.lineKey);
            }
          }}
          onLineMouseEnter={() => {
            if (row.lineKey) {
              onLineMouseEnter(row.lineKey);
            }
          }}
        />
      );
    }

    if (row.type === "thread") {
      return (
        <DiffThreadRow
          thread={row.thread}
          onResolveThread={onResolveThread}
          resolvingDiscussionId={resolvingDiscussionId}
        />
      );
    }

    return (
      <DiffCommentFormRow
        commentBody={commentBody}
        errorMessage={submitError}
        isSubmitting={isSubmitting}
        rangeLabel={selectionRangeLabel}
        onChange={onCommentBodyChange}
        onCancel={onCancelComment}
        onSubmit={onSubmitComment}
      />
    );
  },
);

const StaticDiffBody = memo(
  ({
    rows,
    canComment,
    lineSelection,
    orderedLineKeys,
    commentBody,
    submitError,
    isSubmitting,
    selectionRangeLabel,
    onLineClick,
    onLineMouseDown,
    onLineMouseEnter,
    onCommentBodyChange,
    onCancelComment,
    onSubmitComment,
    onExpandGap,
    onRegisterScrollToRow,
    onResolveThread,
    resolvingDiscussionId,
  }: {
    rows: VirtualDiffRow[];
    canComment: boolean;
    lineSelection: DiffLineSelection | null;
    orderedLineKeys: string[];
    commentBody: string;
    submitError: string | null;
    isSubmitting: boolean;
    selectionRangeLabel: string | null;
    onLineClick: (lineKey: string, shiftKey: boolean) => void;
    onLineMouseDown: (lineKey: string) => void;
    onLineMouseEnter: (lineKey: string) => void;
    onCommentBodyChange: (value: string) => void;
    onCancelComment: () => void;
    onSubmitComment: () => void;
    onExpandGap?: (gapId: string, mode: DiffExpandMode) => void;
    onRegisterScrollToRow?: (scrollToRow: (rowId: string) => void) => void;
  } & DiffThreadResolveProps) => {
    const normalizedSelection = useMemo(() => {
      if (!lineSelection) {
        return null;
      }

      return normalizeDiffLineSelection(
        lineSelection.startKey,
        lineSelection.endKey,
        orderedLineKeys,
      );
    }, [lineSelection, orderedLineKeys]);

    const selectedLineKeys = useMemo(() => {
      if (!lineSelection || !normalizedSelection) {
        return new Set<string>();
      }

      return new Set(
        orderedLineKeys.filter((lineKey) =>
          isLineKeyInSelection(lineKey, lineSelection, orderedLineKeys),
        ),
      );
    }, [lineSelection, normalizedSelection, orderedLineKeys]);

    const selectionStartKey = normalizedSelection?.startKey ?? null;
    const selectionEndKey = normalizedSelection?.endKey ?? null;

    useEffect(() => {
      if (!onRegisterScrollToRow) {
        return;
      }

      onRegisterScrollToRow((rowId: string) => {
        document
          .querySelector(`[data-diff-row-id="${CSS.escape(rowId)}"]`)
          ?.scrollIntoView({ block: "center" });
      });
    }, [onRegisterScrollToRow]);

    return (
    <div className="w-full">
      {rows.map((row) => (
        <div
          key={row.id}
          className={getDiffRowLayoutClassName(row)}
          data-diff-row-id={row.id}
        >
          <VirtualDiffRowView
          row={row}
          canComment={canComment}
          selectedLineKeys={selectedLineKeys}
          selectionStartKey={selectionStartKey}
          selectionEndKey={selectionEndKey}
          commentBody={commentBody}
          submitError={submitError}
          isSubmitting={isSubmitting}
          selectionRangeLabel={selectionRangeLabel}
          onLineClick={onLineClick}
          onLineMouseDown={onLineMouseDown}
          onLineMouseEnter={onLineMouseEnter}
          onCommentBodyChange={onCommentBodyChange}
          onCancelComment={onCancelComment}
          onSubmitComment={onSubmitComment}
          onExpandGap={onExpandGap}
          onResolveThread={onResolveThread}
          resolvingDiscussionId={resolvingDiscussionId}
        />
        </div>
      ))}
    </div>
    );
  },
);

const VirtualizedDiffBody = memo(
  ({
    rows,
    canComment,
    lineSelection,
    orderedLineKeys,
    commentFormLineKey,
    commentBody,
    submitError,
    isSubmitting,
    selectionRangeLabel,
    onLineClick,
    onLineMouseDown,
    onLineMouseEnter,
    onCommentBodyChange,
    onCancelComment,
    onSubmitComment,
    onExpandGap,
    onRegisterScrollToRow,
    onResolveThread,
    resolvingDiscussionId,
  }: {
    rows: VirtualDiffRow[];
    canComment: boolean;
    lineSelection: DiffLineSelection | null;
    orderedLineKeys: string[];
    commentFormLineKey: string | null;
    commentBody: string;
    submitError: string | null;
    isSubmitting: boolean;
    selectionRangeLabel: string | null;
    onLineClick: (lineKey: string, shiftKey: boolean) => void;
    onLineMouseDown: (lineKey: string) => void;
    onLineMouseEnter: (lineKey: string) => void;
    onCommentBodyChange: (value: string) => void;
    onCancelComment: () => void;
    onSubmitComment: () => void;
    onExpandGap?: (gapId: string, mode: DiffExpandMode) => void;
    onRegisterScrollToRow?: (scrollToRow: (rowId: string) => void) => void;
  } & DiffThreadResolveProps) => {
    const parentRef = useRef<HTMLDivElement>(null);
    const rowIds = useMemo(() => rows.map((row) => row.id).join("\0"), [rows]);
    const normalizedSelection = useMemo(() => {
      if (!lineSelection) {
        return null;
      }

      return normalizeDiffLineSelection(
        lineSelection.startKey,
        lineSelection.endKey,
        orderedLineKeys,
      );
    }, [lineSelection, orderedLineKeys]);

    const selectedLineKeys = useMemo(() => {
      if (!lineSelection || !normalizedSelection) {
        return new Set<string>();
      }

      return new Set(
        orderedLineKeys.filter((lineKey) =>
          isLineKeyInSelection(lineKey, lineSelection, orderedLineKeys),
        ),
      );
    }, [lineSelection, normalizedSelection, orderedLineKeys]);

    const selectionStartKey = normalizedSelection?.startKey ?? null;
    const selectionEndKey = normalizedSelection?.endKey ?? null;

    const virtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: (index) => rows[index]?.estimatedHeight ?? 20,
      getItemKey: (index) => rows[index]?.id ?? index,
      overscan: 24,
      measureElement: (element) => {
        const index = Number(element.getAttribute("data-index"));
        const row = rows[index];

        if (
          row?.type === "line" ||
          row?.type === "hunk" ||
          row?.type === "expand"
        ) {
          return row.estimatedHeight;
        }

        return element.getBoundingClientRect().height;
      },
    });

    useLayoutEffect(() => {
      virtualizer.measure();
    }, [rowIds, virtualizer]);

    useEffect(() => {
      if (!commentFormLineKey) {
        return;
      }

      const formIndex = rows.findIndex(
        (row) => row.type === "comment-form" && row.lineKey === commentFormLineKey,
      );

      if (formIndex >= 0) {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(formIndex, { align: "center" });
        });
      }
    }, [commentFormLineKey, rows, virtualizer]);

    useEffect(() => {
      if (!onRegisterScrollToRow) {
        return;
      }

      onRegisterScrollToRow((rowId: string) => {
        const index = rows.findIndex((row) => row.id === rowId);
        if (index >= 0) {
          virtualizer.scrollToIndex(index, { align: "center" });
        }
      });
    }, [onRegisterScrollToRow, rows, virtualizer]);

    return (
      <div ref={parentRef} className="diff-viewport max-h-[min(70vh,900px)] overflow-auto overscroll-contain">
        <div
          className="relative w-full"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];

            return (
              <div
                key={row.id}
                data-index={virtualRow.index}
                data-diff-row-id={row.id}
                ref={virtualizer.measureElement}
                className={getDiffRowLayoutClassName(row)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <VirtualDiffRowView
                  row={row}
                  canComment={canComment}
                  selectedLineKeys={selectedLineKeys}
                  selectionStartKey={selectionStartKey}
                  selectionEndKey={selectionEndKey}
                  commentBody={commentBody}
                  submitError={submitError}
                  isSubmitting={isSubmitting}
                  selectionRangeLabel={selectionRangeLabel}
                  onLineClick={onLineClick}
                  onLineMouseDown={onLineMouseDown}
                  onLineMouseEnter={onLineMouseEnter}
                  onCommentBodyChange={onCommentBodyChange}
                  onCancelComment={onCancelComment}
                  onSubmitComment={onSubmitComment}
                  onExpandGap={onExpandGap}
                  onResolveThread={onResolveThread}
                  resolvingDiscussionId={resolvingDiscussionId}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

export const DiffBody = memo(
  ({
    rows,
    virtualized,
    canComment,
    lineSelection,
    orderedLineKeys,
    commentFormLineKey,
    commentBody,
    submitError,
    isSubmitting,
    selectionRangeLabel,
    onLineClick,
    onLineMouseDown,
    onLineMouseEnter,
    onCommentBodyChange,
    onCancelComment,
    onSubmitComment,
    onExpandGap,
    onRegisterScrollToRow,
    onResolveThread,
    resolvingDiscussionId,
  }: {
    rows: VirtualDiffRow[];
    virtualized: boolean;
    canComment: boolean;
    lineSelection: DiffLineSelection | null;
    orderedLineKeys: string[];
    commentFormLineKey: string | null;
    commentBody: string;
    submitError: string | null;
    isSubmitting: boolean;
    selectionRangeLabel: string | null;
    onLineClick: (lineKey: string, shiftKey: boolean) => void;
    onLineMouseDown: (lineKey: string) => void;
    onLineMouseEnter: (lineKey: string) => void;
    onCommentBodyChange: (value: string) => void;
    onCancelComment: () => void;
    onSubmitComment: () => void;
    onExpandGap?: (gapId: string, mode: DiffExpandMode) => void;
    onRegisterScrollToRow?: (scrollToRow: (rowId: string) => void) => void;
  } & DiffThreadResolveProps) => {
    if (virtualized) {
      return (
        <VirtualizedDiffBody
          rows={rows}
          canComment={canComment}
          lineSelection={lineSelection}
          orderedLineKeys={orderedLineKeys}
          commentFormLineKey={commentFormLineKey}
          commentBody={commentBody}
          submitError={submitError}
          isSubmitting={isSubmitting}
          selectionRangeLabel={selectionRangeLabel}
          onLineClick={onLineClick}
          onLineMouseDown={onLineMouseDown}
          onLineMouseEnter={onLineMouseEnter}
          onCommentBodyChange={onCommentBodyChange}
          onCancelComment={onCancelComment}
          onSubmitComment={onSubmitComment}
          onExpandGap={onExpandGap}
          onRegisterScrollToRow={onRegisterScrollToRow}
          onResolveThread={onResolveThread}
          resolvingDiscussionId={resolvingDiscussionId}
        />
      );
    }

    return (
      <StaticDiffBody
        rows={rows}
        canComment={canComment}
        lineSelection={lineSelection}
        orderedLineKeys={orderedLineKeys}
        commentBody={commentBody}
        submitError={submitError}
        isSubmitting={isSubmitting}
        selectionRangeLabel={selectionRangeLabel}
        onLineClick={onLineClick}
        onLineMouseDown={onLineMouseDown}
        onLineMouseEnter={onLineMouseEnter}
        onCommentBodyChange={onCommentBodyChange}
        onCancelComment={onCancelComment}
        onSubmitComment={onSubmitComment}
        onExpandGap={onExpandGap}
        onRegisterScrollToRow={onRegisterScrollToRow}
        onResolveThread={onResolveThread}
        resolvingDiscussionId={resolvingDiscussionId}
      />
    );
  },
);
