import { memo } from "react";
import type { DiffExpandGap } from "@/shared/lib/expand-diff-context";
import type { GitLabNote } from "@/shared/api/gitlab";
import type { WordDiffSegment } from "@/shared/lib/compute-word-diff";
import { cn } from "@/shared/lib/cn";
import type { InlineDiffThread } from "@/shared/lib/diff-discussions";
import type { DiffDisplayLine } from "@/shared/lib/parse-unified-diff";

export const diffGridClassName =
  "grid w-full min-w-max grid-cols-[50px_50px_24px_minmax(0,1fr)]";

const numBaseClassName =
  "w-[50px] select-none border-r border-[#dbdbdb] bg-[#fafafa] px-2 text-right font-mono text-xs leading-5 text-[#8c8c8c] dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#6e7681]";

const getLineSurfaceClasses = (type: DiffDisplayLine["type"]) => {
  switch (type) {
    case "add":
      return {
        oldNum: "",
        newNum: "bg-[#e6ffec] dark:bg-[#12261e]",
        prefix:
          "bg-[#e6ffec] text-[#116329] dark:bg-[#12261e] dark:text-[#3fb950]",
        code: "bg-[#e6ffec] text-[#116329] dark:bg-[#12261e] dark:text-[#3fb950]",
      };
    case "delete":
      return {
        oldNum: "bg-[#ffebe9] dark:bg-[#2d1114]",
        newNum: "",
        prefix:
          "bg-[#ffebe9] text-[#9f2a2a] dark:bg-[#2d1114] dark:text-[#ff7b72]",
        code: "bg-[#ffebe9] text-[#9f2a2a] dark:bg-[#2d1114] dark:text-[#ff7b72]",
      };
    case "no-newline":
      return {
        oldNum: "bg-white dark:bg-[#0d1117]",
        newNum: "bg-white dark:bg-[#0d1117]",
        prefix: "bg-white dark:bg-[#0d1117]",
        code: "bg-white italic text-[#737278] dark:bg-[#0d1117]",
      };
    default:
      return {
        oldNum: "bg-white dark:bg-[#0d1117]",
        newNum: "bg-white dark:bg-[#0d1117]",
        prefix: "bg-white text-transparent dark:bg-[#0d1117]",
        code: "bg-white dark:bg-[#0d1117]",
      };
  }
};

const WordDiffContent = memo(({ segments }: { segments: WordDiffSegment[] }) => (
  <>
    {segments.map((segment, index) =>
      segment.highlight ? (
        <span
          key={index}
          className={cn(
            "rounded-sm",
            segment.highlight === "add" &&
              "bg-[#abf2bc] dark:bg-[#1b4721]",
            segment.highlight === "del" &&
              "bg-[#ffc1bc] dark:bg-[#5c1f1a]",
          )}
        >
          {segment.text}
        </span>
      ) : (
        <span key={index}>{segment.text}</span>
      ),
    )}
  </>
));

const DiffLineContent = memo(
  ({
    line,
    wordDiffSegments,
  }: {
    line: DiffDisplayLine;
    wordDiffSegments: WordDiffSegment[] | null;
  }) => {
    if (line.type === "no-newline") {
      return <span className="italic text-[#737278]">{line.text}</span>;
    }

    if (wordDiffSegments) {
      return <WordDiffContent segments={wordDiffSegments} />;
    }

    return <>{line.text || " "}</>;
  },
);

export const DiffExpandRow = memo(
  ({
    gap,
    label,
    isLoading,
    onExpand,
  }: {
    gap: DiffExpandGap;
    label: string;
    isLoading: boolean;
    onExpand: (gap: DiffExpandGap) => void;
  }) => (
    <div className={diffGridClassName}>
      <div className="col-span-4 border-y border-[#dbdbdb] bg-[#fafafa] dark:border-[#30363d] dark:bg-[#161b22]">
        <button
          className="flex w-full cursor-pointer items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#fc6d26] transition hover:bg-orange-50 disabled:cursor-wait disabled:opacity-60 dark:text-orange-300 dark:hover:bg-orange-950/40"
          type="button"
          disabled={isLoading}
          onClick={() => onExpand(gap)}
        >
          {isLoading ? "Загружаем..." : label}
        </button>
      </div>
    </div>
  ),
);

export const DiffHunkRow = memo(({ header }: { header: string }) => (
  <div className={diffGridClassName}>
    <div className="col-span-4 whitespace-pre-wrap break-words bg-[#f5f5f5] px-3 py-1.5 font-mono text-xs text-[#737278] dark:bg-[#161b22] dark:text-[#8b949e]">
      {header}
    </div>
  </div>
));

export const DiffLineRow = memo(
  ({
    line,
    prefix,
    lineKey,
    canComment,
    hasThreads,
    isSelected,
    isSelectionStart,
    isSelectionEnd,
    wordDiffSegments,
    onCommentClick,
    onLineMouseDown,
    onLineMouseEnter,
  }: {
    line: DiffDisplayLine;
    prefix: "+" | "-" | " ";
    lineKey: string | null;
    canComment: boolean;
    hasThreads: boolean;
    isSelected: boolean;
    isSelectionStart: boolean;
    isSelectionEnd: boolean;
    wordDiffSegments: WordDiffSegment[] | null;
    onCommentClick: (shiftKey: boolean) => void;
    onLineMouseDown?: () => void;
    onLineMouseEnter?: () => void;
  }) => {
    const surface = getLineSurfaceClasses(line.type);
    const isCommentable = canComment && lineKey;
    const selectionClassName = isSelected
      ? "bg-blue-100 dark:bg-blue-950/70"
      : "";

    return (
      <div
        className={cn(
          "group w-full min-w-max",
          diffGridClassName,
          "items-start",
        )}
        onMouseEnter={isCommentable ? onLineMouseEnter : undefined}
      >
        <div
          className={cn(
            numBaseClassName,
            surface.oldNum,
            hasThreads && !isSelected && "bg-orange-50 dark:bg-orange-950",
            selectionClassName,
            isSelectionStart && "shadow-[inset_2px_0_0_0_#2563eb]",
            isSelectionEnd && "shadow-[inset_2px_0_0_0_#2563eb]",
          )}
        >
          <div className="relative flex min-h-5 items-center justify-end gap-1">
            {line.oldLine ?? ""}
            {isCommentable && (
              <button
                className={cn(
                  "hidden h-[18px] w-[18px] cursor-pointer place-items-center rounded border border-slate-300 bg-white text-sm leading-none text-slate-500 hover:border-[#fc6d26] hover:bg-orange-50 hover:text-orange-700 group-hover:inline-grid dark:border-slate-600 dark:bg-gray-900 dark:text-slate-300 dark:hover:border-[#fc6d26] dark:hover:bg-orange-950 dark:hover:text-orange-300",
                  isSelected && "inline-grid",
                )}
                type="button"
                title="Оставить комментарий"
                onClick={(event) => {
                  event.stopPropagation();
                  onCommentClick(event.shiftKey);
                }}
              >
                +
              </button>
            )}
          </div>
        </div>
        <div
          className={cn(
            numBaseClassName,
            surface.newNum,
            selectionClassName,
            isSelectionStart && "shadow-[inset_2px_0_0_0_#2563eb]",
            isSelectionEnd && "shadow-[inset_2px_0_0_0_#2563eb]",
          )}
        >
          <div className="flex min-h-5 items-center justify-end">
            {line.newLine ?? ""}
          </div>
        </div>
        <div
          className={cn(
            "w-6 select-none px-1 text-center font-mono text-xs leading-5 text-[#8c8c8c] dark:text-[#6e7681]",
            surface.prefix,
            selectionClassName,
          )}
          aria-hidden="true"
        >
          {prefix}
        </div>
        <div
          className={cn(
            "overflow-x-auto whitespace-pre py-0 pr-3 font-mono text-xs leading-5",
            surface.code,
            selectionClassName,
            isCommentable && "cursor-pointer select-none hover:shadow-[inset_0_0_0_1px_#2563eb]",
            isSelected && "shadow-[inset_0_0_0_1px_#2563eb]",
          )}
          onMouseDown={
            isCommentable
              ? (event) => {
                  event.preventDefault();
                  onLineMouseDown?.();
                }
              : undefined
          }
          onClick={
            isCommentable
              ? (event) => {
                  onCommentClick(event.shiftKey);
                }
              : undefined
          }
        >
          <code className="text-[#303030] dark:text-[#e6edf3]">
            <DiffLineContent line={line} wordDiffSegments={wordDiffSegments} />
          </code>
        </div>
      </div>
    );
  },
);

const InlineThreadNote = memo(({ note }: { note: GitLabNote }) => (
  <div>
    <div className="mb-1 flex items-center gap-2 text-[13px]">
      <strong>{note.authorName}</strong>
      <span className="font-normal text-slate-500">@{note.authorUsername}</span>
    </div>
    <div className="whitespace-pre-wrap break-words text-sm leading-normal text-slate-800 dark:text-slate-300">
      {note.body}
    </div>
  </div>
));

export const DiffThreadRow = memo(({ thread }: { thread: InlineDiffThread }) => (
  <div className="w-full">
    <div
      className={cn(
        "border-t border-slate-200 bg-[#fafafa] px-3.5 py-3 dark:border-[#30363d] dark:bg-[#161b22]",
        thread.resolved && "bg-green-50 dark:bg-green-950",
      )}
    >
      {thread.resolved && (
        <div className="mb-2 text-[11px] font-bold uppercase text-green-800 dark:text-green-300">
          Resolved
        </div>
      )}
      {thread.notes.map((note, index) => (
        <div
          key={note.id}
          className={cn(index > 0 && "mt-2.5 border-t border-slate-200 pt-2.5 dark:border-[#30363d]")}
        >
          <InlineThreadNote note={note} />
        </div>
      ))}
    </div>
  </div>
));

export const DiffCommentFormRow = memo(
  ({
    commentBody,
    errorMessage,
    isSubmitting,
    rangeLabel,
    onChange,
    onCancel,
    onSubmit,
  }: {
    commentBody: string;
    errorMessage: string | null;
    isSubmitting: boolean;
    rangeLabel?: string | null;
    onChange: (value: string) => void;
    onCancel: () => void;
    onSubmit: () => void;
  }) => (
    <div className="w-full">
      <div className="border-t border-slate-200 bg-orange-50 px-3.5 py-3 dark:border-[#30363d] dark:bg-orange-950">
        {rangeLabel && (
          <div className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
            Комментарий к строкам {rangeLabel}
          </div>
        )}
        <textarea
          className="min-h-[72px] w-full resize-y rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-[#fc6d26] focus:shadow-[0_0_0_3px_rgba(252,109,38,0.15)] disabled:opacity-60 dark:border-orange-800 dark:bg-[#0d1117] dark:text-slate-200"
          placeholder="Напишите комментарий..."
          value={commentBody}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          disabled={isSubmitting}
        />

        {errorMessage && (
          <div className="mt-2 text-[13px] text-red-700 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="mt-2.5 flex gap-2">
          <button
            className="cursor-pointer rounded-lg border border-[#fc6d26] bg-[#fc6d26] px-3.5 py-2 text-[13px] font-semibold text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isSubmitting || !commentBody.trim()}
            onClick={onSubmit}
          >
            {isSubmitting ? "Отправка..." : "Комментировать"}
          </button>
          <button
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-gray-900 dark:text-slate-200 dark:enabled:hover:bg-slate-800"
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  ),
);
