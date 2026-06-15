import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useEffect, useRef } from "react";
import type { VirtualDiffRow } from "@/shared/lib/build-diff-virtual-rows";
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
  lineSelection: DiffLineSelection | null,
  orderedLineKeys: string[],
) => {
  if (!lineKey || !lineSelection) {
    return {
      isSelected: false,
      isSelectionStart: false,
      isSelectionEnd: false,
    };
  }

  const normalized = normalizeDiffLineSelection(
    lineSelection.startKey,
    lineSelection.endKey,
    orderedLineKeys,
  );

  return {
    isSelected: isLineKeyInSelection(lineKey, lineSelection, orderedLineKeys),
    isSelectionStart: lineKey === normalized.startKey,
    isSelectionEnd: lineKey === normalized.endKey,
  };
};

const VirtualDiffRowView = memo(
  ({
    row,
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
  }: {
    row: VirtualDiffRow;
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
    onExpandGap?: (gapId: string) => void;
  }) => {
    if (row.type === "expand") {
      return (
        <DiffExpandRow
          gap={row.gap}
          label={row.label}
          isLoading={row.isLoading}
          onExpand={() => onExpandGap?.(row.gap.id)}
        />
      );
    }

    if (row.type === "hunk") {
      return <DiffHunkRow header={row.header} />;
    }

    if (row.type === "line") {
      const selectionFlags = getLineSelectionFlags(
        row.lineKey,
        lineSelection,
        orderedLineKeys,
      );

      return (
        <DiffLineRow
          line={row.line}
          prefix={row.prefix}
          lineKey={row.lineKey}
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
      return <DiffThreadRow thread={row.thread} />;
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
    onExpandGap?: (gapId: string) => void;
  }) => (
    <div className="w-full min-w-max">
      {rows.map((row) => (
        <VirtualDiffRowView
          key={row.id}
          row={row}
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
        />
      ))}
    </div>
  ),
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
    onExpandGap?: (gapId: string) => void;
  }) => {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: (index) => rows[index]?.estimatedHeight ?? 20,
      overscan: 24,
      measureElement: (element) => element.getBoundingClientRect().height,
    });

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

    return (
      <div ref={parentRef} className="diff-viewport max-h-[min(70vh,900px)] overflow-auto overscroll-contain">
        <div
          className="relative w-full min-w-max"
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
                ref={virtualizer.measureElement}
                className="[contain:layout_style_paint]"
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
    onExpandGap?: (gapId: string) => void;
  }) => {
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
      />
    );
  },
);
