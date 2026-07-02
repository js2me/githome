import { ArrowDownToLine, ArrowUpToLine } from "@gravity-ui/icons";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type {
  DiffExpandGap,
  DiffExpandMode,
  DiffExpandState,
} from "@/shared/lib/expand-diff-context";
import {
  getChunkExpandTooltip,
  getExpandBarLabel,
} from "@/shared/lib/expand-diff-context";
import type { GitLabNoteDC } from "@/shared/api/gitlab";
import type { WordDiffSegment } from "@/shared/lib/compute-word-diff";
import { cn } from "@/shared/lib/cn";
import type { InlineDiffThread } from "@/shared/lib/gitlab/diff-discussions";
import type { DiffDisplayLine } from "@/shared/lib/parse-unified-diff";
import { GitLabMarkdown } from "@/shared/ui/gitlab-markdown/gitlab-markdown";
import { GitlabAvatar } from "@/shared/ui/gitlab-avatar/gitlab-avatar";
import { useDiffSyntaxHighlight } from "./diff-syntax-highlight";
import { SearchHighlightedText, useRowSearchHighlight } from "./diff-search";
import { HighlightedCode } from "./highlighted-code";

export const diffGridClassName = "git-diff-grid";

const getNotePreview = (body: string, maxLength = 48) => {
  const plain = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[#*_~[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength).trimEnd()}…`;
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "только что";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} мин. назад`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} ч. назад`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} дн. назад`;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ResolvedThreadAvatarTooltip = ({
  anchorRef,
  authorName,
  preview,
  open,
}: {
  anchorRef: RefObject<HTMLDivElement | null>;
  authorName: string;
  preview: string;
  open: boolean;
}) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    setPosition({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();

    const handleReposition = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, updatePosition]);

  if (!open || !position) {
    return null;
  }

  return createPortal(
    <div
      className="git-diff-thread-tooltip git-diff-thread-tooltip--portal"
      role="tooltip"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <span className="font-semibold">{authorName}:</span> {preview}
    </div>,
    document.body,
  );
};

export const ResolvedThreadAvatar = memo(
  ({
    thread,
    onClick,
  }: {
    thread: InlineDiffThread;
    onClick: () => void;
  }) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [tooltipOpen, setTooltipOpen] = useState(false);
    const firstNote = thread.notes[0];
    if (!firstNote) {
      return null;
    }

    const authorName = firstNote.author?.name ?? "Unknown";
    const preview = getNotePreview(firstNote.body);

    return (
      <div
        ref={wrapRef}
        className="git-diff-thread-avatar-wrap"
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
      >
        <button
          className="git-diff-thread-avatar-button"
          type="button"
          aria-label={`Разрешённый комментарий: ${authorName}`}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          <GitlabAvatar
            className="h-5 w-5 rounded-full object-cover"
            avatarUrl={firstNote.author?.avatar_url}
            name={authorName}
          />
        </button>
        <ResolvedThreadAvatarTooltip
          anchorRef={wrapRef}
          authorName={authorName}
          preview={preview}
          open={tooltipOpen}
        />
      </div>
    );
  },
);

const getLineSurfaceClasses = (type: DiffDisplayLine["type"]) => {
  switch (type) {
    case "add":
      return {
        oldNum: "",
        newNum: "git-diff-line-num--new-added",
        prefix: "git-diff-prefix--added",
        code: "git-diff-code--added",
      };
    case "delete":
      return {
        oldNum: "git-diff-line-num--old-removed",
        newNum: "",
        prefix: "git-diff-prefix--removed",
        code: "git-diff-code--removed",
      };
    case "no-newline":
      return {
        oldNum: "",
        newNum: "",
        prefix: "",
        code: "italic text-[var(--diff-hunk-text)]",
      };
    default:
      return {
        oldNum: "",
        newNum: "",
        prefix: "",
        code: "",
      };
  }
};

const WordDiffContent = memo(({ segments }: { segments: WordDiffSegment[] }) => (
  <>
    {segments.map((segment, index) =>
      segment.highlight ? (
        <span
          key={index}
          className={
            segment.highlight === "add"
              ? "git-diff-inline-added"
              : "git-diff-inline-removed"
          }
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
    const searchHighlight = useRowSearchHighlight(rowId);
    const hasSearchHighlight = searchHighlight.ranges.length > 0;

    if (hasSearchHighlight && rowId) {
      return (
        <SearchHighlightedText
          text={line.text || " "}
          ranges={searchHighlight.ranges}
          activeRange={searchHighlight.activeRange}
        />
      );
    }

    if (line.type === "no-newline") {
      return <span className="italic">{line.text}</span>;
    }

    if (wordDiffSegments) {
      return <WordDiffContent segments={wordDiffSegments} />;
    }

    const tokens = syntax?.getLineTokens(line) ?? null;

    return (
      <HighlightedCode
        tokens={tokens}
        fallback={line.text || " "}
        gitlabSyntax
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
      className="git-diff-expand-button"
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

export const DiffExpandRow = memo(
  ({
    gap,
    expandState,
    isLoading,
    onExpand,
    hunkHeader,
  }: {
    gap: DiffExpandGap;
    expandState: DiffExpandState;
    isLoading: boolean;
    onExpand: (gap: DiffExpandGap, mode: DiffExpandMode) => void;
    hunkHeader?: string;
  }) => {
    const isBetweenGap = gap.id.startsWith("between:");
    const showUp = gap.direction === "up" || isBetweenGap;
    const showDown = gap.direction === "down" || isBetweenGap;

    return (
      <div
        className={cn(
          diffGridClassName,
          "git-diff-expand-row",
          hunkHeader && "git-diff-expand-row--collapsed-hunk",
        )}
      >
        <div className="git-diff-expand-gutter">
          {showDown && (
            <ExpandIconButton
              title={getChunkExpandTooltip("down", expandState, gap)}
              isLoading={isLoading}
              onClick={() => onExpand(gap, "chunk-down")}
            >
              <ArrowDownToLine />
            </ExpandIconButton>
          )}
          {showUp && (
            <ExpandIconButton
              title={getChunkExpandTooltip("up", expandState, gap)}
              isLoading={isLoading}
              onClick={() => onExpand(gap, "chunk-up")}
            >
              <ArrowUpToLine />
            </ExpandIconButton>
          )}
        </div>
        {hunkHeader ? (
          <div className="git-diff-expand-hunk">{hunkHeader}</div>
        ) : (
          <div className="git-diff-expand-label">
            {getExpandBarLabel(gap, expandState)}
          </div>
        )}
      </div>
    );
  },
);

export const DiffHunkRow = memo(({ header }: { header: string }) => (
  <div className={diffGridClassName}>
    <div className="git-diff-hunk">{header}</div>
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
    threads,
    isThreadExpanded,
    onToggleThreadExpand,
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
    threads: InlineDiffThread[];
    isThreadExpanded?: (discussionId: string) => boolean;
    onToggleThreadExpand?: (discussionId: string) => void;
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
    const collapsedResolvedThreads = threads.filter(
      (thread) =>
        thread.resolved && !(isThreadExpanded?.(thread.discussionId) ?? false),
    );
    const hasVisibleThreads =
      hasThreads &&
      (threads.some((thread) => !thread.resolved) ||
        collapsedResolvedThreads.length < threads.length);
    const selectionClassName = isSelected
      ? "bg-blue-50 dark:bg-blue-950/70"
      : "";

    const lineNumInteractionClassName = isCommentable
      ? "cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/40"
      : "";
    const handleLineNumMouseDown = isCommentable
      ? (event: MouseEvent) => {
        event.preventDefault();
        onLineMouseDown?.();
      }
      : undefined;
    const handleLineNumClick = isCommentable
      ? (event: MouseEvent) => {
        onCommentClick(event.shiftKey);
      }
      : undefined;

    return (
      <div
        className={cn(
          "group relative w-full min-w-max items-start overflow-visible",
          diffGridClassName,
          collapsedResolvedThreads.length > 0 && "git-diff-line--has-resolved-thread",
        )}
        data-diff-row-id={rowId}
        onMouseEnter={isCommentable ? onLineMouseEnter : undefined}
      >
        {collapsedResolvedThreads.length > 0 && (
          <div className="git-diff-line-thread-avatars">
            {collapsedResolvedThreads.map((thread) => (
              <ResolvedThreadAvatar
                key={thread.discussionId}
                thread={thread}
                onClick={() => onToggleThreadExpand?.(thread.discussionId)}
              />
            ))}
          </div>
        )}
        <div
          className={cn(
            "git-diff-line-num git-diff-line-num--old-border",
            surface.oldNum,
            hasVisibleThreads && !isSelected && "bg-orange-50 dark:bg-orange-950",
            selectionClassName,
            lineNumInteractionClassName,
            isSelectionStart && "shadow-[inset_2px_0_0_0_var(--color-accent-blue-emphasis)]",
            isSelectionEnd && "shadow-[inset_2px_0_0_0_var(--color-accent-blue-emphasis)]",
          )}
          onMouseDown={handleLineNumMouseDown}
          onClick={handleLineNumClick}
        >
          <div className="git-diff-line-num-inner">
            {line.oldLine ?? ""}
            {isCommentable && (
              <button
                className={cn(
                  "git-diff-comment-button",
                  isSelected && "git-diff-comment-button--visible",
                )}
                type="button"
                title="Оставить комментарий"
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
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
            "git-diff-line-num",
            surface.newNum,
            selectionClassName,
            lineNumInteractionClassName,
            isSelectionStart && "shadow-[inset_2px_0_0_0_var(--color-accent-blue-emphasis)]",
            isSelectionEnd && "shadow-[inset_2px_0_0_0_var(--color-accent-blue-emphasis)]",
          )}
          onMouseDown={handleLineNumMouseDown}
          onClick={handleLineNumClick}
        >
          <div className="git-diff-line-num-inner">
            {line.newLine ?? ""}
          </div>
        </div>
        <div
          className={cn("git-diff-prefix", surface.prefix, selectionClassName)}
          aria-hidden="true"
        >
          {prefix === " " ? "" : prefix}
        </div>
        <div
          className={cn(
            "git-diff-code",
            surface.code,
            selectionClassName,
            isSelected && "shadow-[inset_0_0_0_1px_var(--color-accent-blue-emphasis)]",
          )}
        >
          <code>
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

const InlineThreadNote = memo(
  ({
    note,
    isReply = false,
    resolvedBy,
  }: {
    note: GitLabNoteDC;
    isReply?: boolean;
    resolvedBy?: string | null;
  }) => {
    const authorName = note.author?.name ?? "Unknown";
    const authorUsername = note.author?.username ?? "";

    return (
      <article className={cn("flex min-w-0 gap-3", isReply && "pl-11")}>
        <GitlabAvatar
          className="h-8 w-8 shrink-0 rounded-full object-cover"
          avatarUrl={note.author?.avatar_url}
          name={authorName}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <strong className="text-slate-900 dark:text-slate-200">
              {authorName}
            </strong>
            {authorUsername && (
              <span className="font-normal text-slate-500">@{authorUsername}</span>
            )}
            <time className="text-xs text-slate-400" dateTime={note.created_at}>
              {formatRelativeTime(note.created_at)}
            </time>
          </div>

          {resolvedBy && !isReply && (
            <div className="mb-1.5 text-xs text-blue-600 dark:text-blue-400">
              Разрешён {formatRelativeTime(note.updated_at)} — {resolvedBy}
            </div>
          )}

          <GitLabMarkdown
            text={note.body}
            className="min-w-0 max-w-full text-sm leading-normal text-slate-800 dark:text-slate-300"
          />
        </div>
      </article>
    );
  },
);

export const DiffThreadRow = memo(
  ({
    thread,
    onResolveThread,
    resolvingDiscussionId,
    expanded: expandedProp,
    onToggleExpand,
    placement = "inline",
  }: {
    thread: InlineDiffThread;
    onResolveThread?: (discussionId: string, resolved: boolean) => void;
    resolvingDiscussionId?: string | null;
    expanded?: boolean;
    onToggleExpand?: () => void;
    placement?: "inline" | "file";
  }) => {
    const [internalExpanded, setInternalExpanded] = useState(() => !thread.resolved);
    const isControlled = expandedProp !== undefined;
    const expanded = isControlled ? expandedProp : internalExpanded;

    useEffect(() => {
      if (!isControlled) {
        setInternalExpanded(!thread.resolved);
      }
    }, [isControlled, thread.discussionId, thread.resolved]);

    const toggleExpanded = useCallback(() => {
      if (onToggleExpand) {
        onToggleExpand();
        return;
      }

      setInternalExpanded((value) => !value);
    }, [onToggleExpand]);

    if (thread.resolved && !expanded) {
      if (placement === "inline") {
        return null;
      }

      const firstNote = thread.notes[0];
      if (!firstNote) {
        return null;
      }

      return (
        <div className="border-b border-slate-200 px-3.5 py-2 dark:border-[var(--color-border-default)]">
          <ResolvedThreadAvatar thread={thread} onClick={toggleExpanded} />
        </div>
      );
    }

    const [firstNote, ...replies] = thread.notes;
    if (!firstNote) {
      return null;
    }

    const resolvedBy = thread.resolved
      ? (firstNote.author?.name ?? "Unknown")
      : null;

    return (
      <div className="w-full min-w-full border-t-2 border-[var(--color-brand-border-accent)]">
        <div className="bg-white px-3.5 py-3 dark:bg-gray-900">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900">
            <div className="p-3.5">
              <InlineThreadNote
                note={firstNote}
                resolvedBy={resolvedBy}
              />

              {replies.length > 0 && (
                <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                  {replies.map((note) => (
                    <InlineThreadNote key={note.id} note={note} isReply />
                  ))}
                </div>
              )}
            </div>

            {thread.resolvable && onResolveThread && (
              <div className="flex justify-end border-t border-slate-200 px-3.5 py-2.5 dark:border-slate-700">
                <button
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800"
                  type="button"
                  disabled={resolvingDiscussionId === thread.discussionId}
                  onClick={() =>
                    onResolveThread(thread.discussionId, !thread.resolved)
                  }
                >
                  {thread.resolved ? "Открыть тред" : "Разрешить тред"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
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
      <div className="border-t border-slate-200 bg-orange-50 px-3.5 py-3 dark:border-[var(--color-border-default)] dark:bg-orange-950">
        {rangeLabel && (
          <div className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
            Комментарий к строкам {rangeLabel}
          </div>
        )}
        <textarea
          className="min-h-[72px] w-full resize-y rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-focus-shadow)] disabled:opacity-60 dark:border-orange-800 dark:bg-canvas-default dark:text-slate-200"
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
            className="cursor-pointer rounded-lg border border-brand bg-brand px-3.5 py-2 text-[13px] font-semibold text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
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
