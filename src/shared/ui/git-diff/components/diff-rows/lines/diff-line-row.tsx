import { observer } from 'mobx-react-lite';
import type { MouseEvent } from 'react';
import { cn } from '@/shared/lib/cn';
import type { WordDiffSegment } from '@/shared/lib/diff/compute-word-diff';
import type { DiffDisplayLine } from '@/shared/lib/diff/parse-unified-diff';
import type { InlineDiffThread } from '@/shared/lib/gitlab/discussions/diff-discussions';
import { ResolvedThreadAvatar } from '../discussions/resolved-thread-avatar';
import { diffGridClassName } from '../grid-class';
import { DiffLineContent } from './diff-line-content';

const getLineSurfaceClasses = (type: DiffDisplayLine['type']) => {
  switch (type) {
    case 'add':
      return {
        oldNum: '',
        newNum: 'git-diff-line-num--new-added',
        prefix: 'git-diff-prefix--added',
        code: 'git-diff-code--added',
      };
    case 'delete':
      return {
        oldNum: 'git-diff-line-num--old-removed',
        newNum: '',
        prefix: 'git-diff-prefix--removed',
        code: 'git-diff-code--removed',
      };
    case 'no-newline':
      return {
        oldNum: '',
        newNum: '',
        prefix: '',
        code: 'italic text-[var(--diff-hunk-text)]',
      };
    default:
      return {
        oldNum: '',
        newNum: '',
        prefix: '',
        code: '',
      };
  }
};

export const DiffLineRow = observer(
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
    prefix: '+' | '-' | ' ';
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
      ? 'bg-blue-50 dark:bg-blue-950/70'
      : '';

    const lineNumInteractionClassName = isCommentable
      ? 'cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/40'
      : '';
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
          'group relative w-full min-w-max items-start overflow-visible',
          diffGridClassName,
          collapsedResolvedThreads.length > 0 &&
            'git-diff-line--has-resolved-thread',
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
            'git-diff-line-num git-diff-line-num--old-border',
            surface.oldNum,
            hasVisibleThreads && !isSelected && 'bg-info-surface',
            selectionClassName,
            lineNumInteractionClassName,
            isSelectionStart &&
              'shadow-[inset_2px_0_0_0_var(--color-accent-blue-emphasis)]',
            isSelectionEnd &&
              'shadow-[inset_2px_0_0_0_var(--color-accent-blue-emphasis)]',
          )}
          onMouseDown={handleLineNumMouseDown}
          onClick={handleLineNumClick}
        >
          <div className="git-diff-line-num-inner">
            {line.oldLine ?? ''}
            {isCommentable && (
              <button
                className={cn(
                  'git-diff-comment-button',
                  isSelected && 'git-diff-comment-button--visible',
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
            'git-diff-line-num',
            surface.newNum,
            selectionClassName,
            lineNumInteractionClassName,
            isSelectionStart &&
              'shadow-[inset_2px_0_0_0_var(--color-accent-blue-emphasis)]',
            isSelectionEnd &&
              'shadow-[inset_2px_0_0_0_var(--color-accent-blue-emphasis)]',
          )}
          onMouseDown={handleLineNumMouseDown}
          onClick={handleLineNumClick}
        >
          <div className="git-diff-line-num-inner">{line.newLine ?? ''}</div>
        </div>
        <div
          className={cn('git-diff-prefix', surface.prefix, selectionClassName)}
          aria-hidden="true"
        >
          {prefix === ' ' ? '' : prefix}
        </div>
        <div
          className={cn(
            'git-diff-code',
            surface.code,
            selectionClassName,
            isSelected &&
              'shadow-[inset_0_0_0_1px_var(--color-accent-blue-emphasis)]',
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
