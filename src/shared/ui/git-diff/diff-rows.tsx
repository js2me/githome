import { memo, type ReactNode } from "react";
import type {
  DiffExpandGap,
  DiffExpandMode,
  DiffExpandState,
} from "@/shared/lib/expand-diff-context";
import {
  getChunkExpandTooltip,
  supportsExpandFromEnd,
} from "@/shared/lib/expand-diff-context";
import type { GitLabNote } from "@/shared/api/gitlab";
import type { WordDiffSegment } from "@/shared/lib/compute-word-diff";
import { cn } from "@/shared/lib/cn";
import type { InlineDiffThread } from "@/shared/lib/diff-discussions";
import type { DiffDisplayLine } from "@/shared/lib/parse-unified-diff";
import { GitLabMarkdown } from "@/shared/ui/gitlab-markdown/gitlab-markdown";
import { useDiffSyntaxHighlight } from "./diff-syntax-highlight";
import { SearchHighlightedText, useDiffSearchOptional } from "./diff-search";
import { HighlightedCode } from "./highlighted-code";

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
        code: "bg-[#e6ffec] dark:bg-[#12261e]",
      };
    case "delete":
      return {
        oldNum: "bg-[#ffebe9] dark:bg-[#2d1114]",
        newNum: "",
        prefix:
          "bg-[#ffebe9] text-[#9f2a2a] dark:bg-[#2d1114] dark:text-[#ff7b72]",
        code: "bg-[#ffebe9] dark:bg-[#2d1114]",
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
    rowId,
  }: {
    line: DiffDisplayLine;
    wordDiffSegments: WordDiffSegment[] | null;
    rowId?: string;
  }) => {
    const syntax = useDiffSyntaxHighlight();
    const search = useDiffSearchOptional();
    const ranges =
      rowId && search?.query.trim() ? search.getRowSearchRanges(rowId) : [];
    const hasSearchHighlight = ranges.length > 0;

    if (hasSearchHighlight && rowId) {
      return (
        <SearchHighlightedText
          text={line.text || " "}
          ranges={ranges}
          isRangeActive={(range) => search?.isRowRangeActive(rowId, range) ?? false}
        />
      );
    }

    if (line.type === "no-newline") {
      return <span className="italic text-[#737278]">{line.text}</span>;
    }

    if (wordDiffSegments) {
      return <WordDiffContent segments={wordDiffSegments} />;
    }

    const tokens = syntax?.getLineTokens(line) ?? null;

    return (
      <HighlightedCode
        tokens={tokens}
        fallback={line.text || " "}
      />
    );
  },
);

const ExpandIconButton = memo(
  ({
    title,
    isLoading,
    onClick,
    children,
  }: {
    title: string;
    isLoading: boolean;
    onClick: () => void;
    children: ReactNode;
  }) => (
    <button
      className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#595959] transition hover:bg-[#ececec] disabled:cursor-wait disabled:opacity-50 dark:text-[#8b949e] dark:hover:bg-[#21262d]"
      type="button"
      title={title}
      aria-label={title}
      disabled={isLoading}
      onClick={onClick}
    >
      {children}
    </button>
  ),
);

const ExpandChevronUpIcon = () => (
  <svg
    aria-hidden="true"
    className="h-3.5 w-3.5"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 10l4-4 4 4" />
  </svg>
);

const ExpandChevronDownIcon = () => (
  <svg
    aria-hidden="true"
    className="h-3.5 w-3.5"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 6l4 4 4-4" />
  </svg>
);

const ExpandAllIcon = () => (
  <svg
    aria-hidden="true"
    className="h-3.5 w-3.5"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 6l4 4 4-4" />
    <path d="M4 10l4-4 4 4" />
  </svg>
);

export const DiffExpandRow = memo(
  ({
    gap,
    expandState,
    isLoading,
    onExpand,
  }: {
    gap: DiffExpandGap;
    expandState: DiffExpandState;
    isLoading: boolean;
    onExpand: (gap: DiffExpandGap, mode: DiffExpandMode) => void;
  }) => {
    const showDown =
      gap.direction === "down" || supportsExpandFromEnd(gap);
    const showUp = gap.direction === "up" || supportsExpandFromEnd(gap);

    return (
      <div className={diffGridClassName}>
        <div className="col-span-4 flex items-center justify-center gap-0.5 border-y border-[#dbdbdb] bg-[#fafafa] py-0.5 dark:border-[#30363d] dark:bg-[#161b22]">
          {showDown && (
            <ExpandIconButton
              title={getChunkExpandTooltip("down", expandState, gap)}
              isLoading={isLoading}
              onClick={() => onExpand(gap, "chunk-down")}
            >
              <ExpandChevronDownIcon />
            </ExpandIconButton>
          )}
          {showUp && (
            <ExpandIconButton
              title={getChunkExpandTooltip("up", expandState, gap)}
              isLoading={isLoading}
              onClick={() => onExpand(gap, "chunk-up")}
            >
              <ExpandChevronUpIcon />
            </ExpandIconButton>
          )}
          <ExpandIconButton
            title="Показать все строки"
            isLoading={isLoading}
            onClick={() => onExpand(gap, "all")}
          >
            <ExpandAllIcon />
          </ExpandIconButton>
        </div>
      </div>
    );
  },
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
    rowId,
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
    rowId?: string;
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
        data-diff-row-id={rowId}
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
          <code className="text-[#24292e] dark:text-[#e6edf3]">
            <DiffLineContent
              line={line}
              wordDiffSegments={wordDiffSegments}
              rowId={rowId}
            />
          </code>
        </div>
      </div>
    );
  },
);

const InlineThreadNote = memo(({ note }: { note: GitLabNote }) => (
  <div className="flex min-w-0 gap-3">
    {note.authorAvatarUrl ? (
      <img
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        src={note.authorAvatarUrl}
        alt=""
      />
    ) : (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-[13px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        {note.authorName.slice(0, 1).toUpperCase()}
      </div>
    )}

    <div className="min-w-0 flex-1">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-[13px]">
        <strong className="text-slate-900 dark:text-slate-200">
          {note.authorName}
        </strong>
        <span className="font-normal text-slate-500">@{note.authorUsername}</span>
      </div>
      <GitLabMarkdown
        text={note.body}
        className="min-w-0 max-w-full text-sm leading-normal text-slate-800 dark:text-slate-300"
      />
    </div>
  </div>
));

export const DiffThreadRow = memo(
  ({
    thread,
    onResolveThread,
    resolvingDiscussionId,
  }: {
    thread: InlineDiffThread;
    onResolveThread?: (discussionId: string, resolved: boolean) => void;
    resolvingDiscussionId?: string | null;
  }) => (
  <div className="w-full min-w-0 max-w-full overflow-hidden border-t-2 border-[#fc6d26]/70">
    <div
      className={cn(
        "bg-[#fafafa] px-3.5 py-3 dark:bg-[#161b22]",
        thread.resolved && "bg-green-50 dark:bg-green-950",
      )}
    >
      {thread.resolved && (
        <div className="mb-2 text-[11px] font-bold uppercase text-green-800 dark:text-green-300">
          Разрешён
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

      {thread.resolvable && onResolveThread && (
        <div className="mt-3 flex justify-end border-t border-slate-200 pt-3 dark:border-[#30363d]">
          <button
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50 dark:border-slate-600 dark:bg-[#0d1117] dark:text-slate-300 dark:hover:bg-slate-800"
            type="button"
            disabled={resolvingDiscussionId === thread.discussionId}
            onClick={() => onResolveThread(thread.discussionId, !thread.resolved)}
          >
            {thread.resolved ? "Открыть тред" : "Разрешить тред"}
          </button>
        </div>
      )}
    </div>
  </div>
  ),
);

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
    <div className="w-full min-w-0 max-w-full overflow-hidden">
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
