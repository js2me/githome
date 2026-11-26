import {
  ArrowDownToLine,
  ArrowUpToLine,
  Pencil,
  TrashBin,
} from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { withPropsViewModel } from 'mobx-view-model-react';
import { type MouseEvent, memo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import type { WordDiffSegment } from '@/shared/lib/compute-word-diff';
import type {
  DiffExpandGap,
  DiffExpandMode,
  DiffExpandState,
} from '@/shared/lib/expand-diff-context';
import {
  getChunkExpandTooltip,
  getExpandBarLabel,
} from '@/shared/lib/expand-diff-context';
import type { InlineDiffThread } from '@/shared/lib/gitlab/diff-discussions';
import {
  canEditGitLabNote,
  getDiscussionNoteKey,
} from '@/shared/lib/gitlab/note-permissions';
import type { DiffDisplayLine } from '@/shared/lib/parse-unified-diff';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import { GitlabCommentEditor } from '@/shared/ui/gitlab-comment-editor';
import { GitLabMarkdown } from '@/shared/ui/gitlab-markdown/gitlab-markdown';
import {
  DiffCommentFormVM,
  DiffThreadVM,
  InlineNoteVM,
  ThreadAvatarVM,
} from '../model/discussion-rows';
import { useRowSearchHighlight } from './diff-search';
import { useDiffSyntaxHighlight } from './diff-syntax-highlight';
import { HighlightedCode } from './highlighted-code';

export const diffGridClassName = 'git-diff-grid';

const getNotePreview = (body: string, maxLength = 48) => {
  const plain = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#*_~[\]()]/g, '')
    .replace(/\s+/g, ' ')
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
    return 'только что';
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

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ResolvedThreadAvatar = withPropsViewModel(
  ThreadAvatarVM,
  ({ model }) => {
    const {
      payload: { thread, onClick },
      anchor,
      position,
    } = model;
    const firstNote = thread.notes[0];
    if (!firstNote) {
      return null;
    }

    const authorName = firstNote.author?.name ?? 'Unknown';
    const preview = getNotePreview(firstNote.body);

    return (
      <div
        ref={anchor}
        className="git-diff-thread-avatar-wrap"
        onMouseEnter={model.show}
        onMouseLeave={model.hide}
        onFocus={model.show}
        onBlur={model.hide}
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
        {position &&
          createPortal(
            <div
              className="git-diff-thread-tooltip git-diff-thread-tooltip--portal"
              role="tooltip"
              style={position}
            >
              <span className="font-semibold">{authorName}:</span> {preview}
            </div>,
            document.body,
          )}
      </div>
    );
  },
);

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
    return (
      <HighlightedCode
        text={line.text}
        tokens={syntax?.getLineTokens(line)}
        wordDiffSegments={wordDiffSegments}
        searchHighlight={searchHighlight}
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
    const isBetweenGap = gap.id.startsWith('between:');
    const showUp = gap.direction === 'up' || isBetweenGap;
    const showDown = gap.direction === 'down' || isBetweenGap;

    return (
      <div
        className={cn(
          diffGridClassName,
          'git-diff-expand-row',
          hunkHeader && 'git-diff-expand-row--collapsed-hunk',
        )}
      >
        <div className="git-diff-expand-gutter">
          {showDown && (
            <ExpandIconButton
              title={getChunkExpandTooltip('down', expandState, gap)}
              isLoading={isLoading}
              onClick={() => onExpand(gap, 'chunk-down')}
            >
              <ArrowDownToLine />
            </ExpandIconButton>
          )}
          {showUp && (
            <ExpandIconButton
              title={getChunkExpandTooltip('up', expandState, gap)}
              isLoading={isLoading}
              onClick={() => onExpand(gap, 'chunk-up')}
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

const InlineThreadNote = withPropsViewModel(InlineNoteVM, ({ model }) => {
  const {
    markdownScope,
    note,
    discussionId,
    isReply = false,
    resolvedBy,
    currentUserId = null,
    onUpdateNote,
    onDeleteNote,
    updatingNoteKey = null,
    deletingNoteKey = null,
    updateNoteError = null,
    deleteNoteErrorKey = null,
    deleteNoteError = null,
  } = model.payload;

  const authorName = note.author?.name ?? 'Unknown';
  const authorUsername = note.author?.username ?? '';
  const canEdit = canEditGitLabNote(note, currentUserId);
  const noteKey = getDiscussionNoteKey(discussionId, note.id);
  const isSaving = updatingNoteKey === noteKey;
  const isDeleting = deletingNoteKey === noteKey;
  const noteDeleteError =
    deleteNoteErrorKey === noteKey ? deleteNoteError : null;
  const {
    isEditing,
    editBody,
    start: handleStartEdit,
    cancel: handleCancelEdit,
    save: handleSaveEdit,
    remove: handleDelete,
  } = model.editor;

  return (
    <article className={cn('flex min-w-0 gap-3', isReply && 'pl-11')}>
      <GitlabAvatar
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        avatarUrl={note.author?.avatar_url}
        name={authorName}
      />

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start gap-2 text-[13px]">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="text-slate-900 dark:text-slate-200">
              {authorName}
            </strong>
            {authorUsername && (
              <span className="font-normal text-slate-500">
                @{authorUsername}
              </span>
            )}
            <time className="text-slate-400 text-xs" dateTime={note.created_at}>
              {formatRelativeTime(note.created_at)}
            </time>
          </div>

          {canEdit && !isEditing && (
            <div className="flex shrink-0 items-center gap-1">
              {onUpdateNote && (
                <button
                  className="inline-flex cursor-pointer items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  type="button"
                  title="Редактировать"
                  aria-label="Редактировать комментарий"
                  disabled={Boolean(updatingNoteKey || deletingNoteKey)}
                  onClick={handleStartEdit}
                >
                  <Pencil width={14} height={14} />
                </button>
              )}
              {onDeleteNote && (
                <button
                  className="inline-flex cursor-pointer items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-300"
                  type="button"
                  title={isDeleting ? 'Удаление...' : 'Удалить'}
                  aria-label="Удалить комментарий"
                  disabled={Boolean(updatingNoteKey || deletingNoteKey)}
                  onClick={() => void handleDelete()}
                >
                  <TrashBin width={14} height={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {resolvedBy && !isReply && (
          <div className="mb-1.5 text-blue-600 text-xs dark:text-blue-400">
            Разрешён {formatRelativeTime(note.updated_at)} — {resolvedBy}
          </div>
        )}

        {isEditing ? (
          <div>
            <GitlabCommentEditor
              projectId={markdownScope?.projectId ?? null}
              className="text-sm"
              value={editBody}
              onChange={model.editor.changeBody}
              rows={3}
              disabled={isSaving}
            />

            {updateNoteError && isEditing && (
              <div className="mt-2 text-[13px] text-red-700 dark:text-red-300">
                {updateNoteError}
              </div>
            )}

            <div className="mt-2.5 flex gap-2">
              <button
                className="cursor-pointer rounded-lg border border-brand bg-brand px-3.5 py-2 font-semibold text-[13px] text-brand-on enabled:hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={isSaving || !editBody.trim()}
                onClick={() => {
                  void handleSaveEdit();
                }}
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 font-semibold text-[13px] text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-gray-900 dark:text-slate-200 dark:enabled:hover:bg-slate-800"
                type="button"
                disabled={isSaving}
                onClick={handleCancelEdit}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <GitLabMarkdown
            connection={markdownScope?.connection ?? null}
            projectPath={markdownScope?.projectPath ?? ''}
            projectId={markdownScope?.projectId ?? 0}
            text={note.body}
            className="min-w-0 max-w-full text-slate-800 text-sm leading-normal dark:text-slate-300"
          />
        )}

        {noteDeleteError && (
          <div className="mt-2 text-[13px] text-red-700 dark:text-red-300">
            {noteDeleteError}
          </div>
        )}
      </div>
    </article>
  );
});

export const DiffThreadRow = withPropsViewModel(DiffThreadVM, ({ model }) => {
  const {
    markdownScope,
    thread,
    onResolveThread,
    resolvingDiscussionId,
    onReplyThread,
    replyingDiscussionId,
    replyErrorDiscussionId,
    replyError,
    placement = 'inline',
    currentUserId,
    onUpdateNote,
    onDeleteNote,
    updatingNoteKey,
    deletingNoteKey,
    updateNoteError,
    deleteNoteErrorKey,
    deleteNoteError,
    onClearUpdateNoteError,
    onClearDeleteNoteError,
  } = model.payload;

  const { expanded, isReplying, replyBody, toggleExpanded } = model;

  if (thread.resolved && !expanded) {
    if (placement === 'inline') {
      return null;
    }

    const firstNote = thread.notes[0];
    if (!firstNote) {
      return null;
    }

    return (
      <div className="border-slate-200 border-b px-3.5 py-2 dark:border-[var(--color-border-default)]">
        <ResolvedThreadAvatar thread={thread} onClick={toggleExpanded} />
      </div>
    );
  }

  const [firstNote, ...replies] = thread.notes;
  if (!firstNote) {
    return null;
  }

  const isSubmittingReply = replyingDiscussionId === thread.discussionId;
  const threadReplyError =
    replyErrorDiscussionId === thread.discussionId ? replyError : null;

  const resolvedBy = thread.resolved
    ? (firstNote.author?.name ?? 'Unknown')
    : null;

  return (
    <div className="w-full min-w-full border-[var(--color-brand-border-accent)] border-t-2">
      <div className="bg-white px-3.5 py-3 dark:bg-gray-900">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900">
          <div className="p-3.5">
            <InlineThreadNote
              markdownScope={markdownScope}
              note={firstNote}
              discussionId={thread.discussionId}
              resolvedBy={resolvedBy}
              currentUserId={currentUserId}
              onUpdateNote={onUpdateNote}
              onDeleteNote={onDeleteNote}
              updatingNoteKey={updatingNoteKey}
              deletingNoteKey={deletingNoteKey}
              updateNoteError={updateNoteError}
              deleteNoteErrorKey={deleteNoteErrorKey}
              deleteNoteError={deleteNoteError}
              onClearUpdateNoteError={onClearUpdateNoteError}
              onClearDeleteNoteError={onClearDeleteNoteError}
            />

            {replies.length > 0 && (
              <div className="mt-3 space-y-3 border-slate-200 border-t pt-3 dark:border-slate-700">
                {replies.map((note) => (
                  <InlineThreadNote
                    key={note.id}
                    markdownScope={markdownScope}
                    note={note}
                    discussionId={thread.discussionId}
                    isReply
                    currentUserId={currentUserId}
                    onUpdateNote={onUpdateNote}
                    onDeleteNote={onDeleteNote}
                    updatingNoteKey={updatingNoteKey}
                    deletingNoteKey={deletingNoteKey}
                    updateNoteError={updateNoteError}
                    deleteNoteErrorKey={deleteNoteErrorKey}
                    deleteNoteError={deleteNoteError}
                    onClearUpdateNoteError={onClearUpdateNoteError}
                    onClearDeleteNoteError={onClearDeleteNoteError}
                  />
                ))}
              </div>
            )}

            {onReplyThread && (
              <div className="mt-3 border-slate-200 border-t pt-3 dark:border-slate-700">
                {isReplying ? (
                  <div>
                    <GitlabCommentEditor
                      projectId={markdownScope?.projectId ?? null}
                      className="text-sm"
                      placeholder="Напишите ответ в тред..."
                      value={replyBody}
                      onChange={model.changeReply}
                      rows={3}
                      disabled={isSubmittingReply}
                    />
                    {threadReplyError && (
                      <div className="mt-2 text-[13px] text-red-700 dark:text-red-300">
                        {threadReplyError}
                      </div>
                    )}
                    <div className="mt-2.5 flex gap-2">
                      <button
                        className="cursor-pointer rounded-lg border border-brand bg-brand px-3.5 py-2 font-semibold text-[13px] text-brand-on enabled:hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        disabled={isSubmittingReply || !replyBody.trim()}
                        onClick={() => void model.submitReply()}
                      >
                        {isSubmittingReply ? 'Отправка...' : 'Ответить'}
                      </button>
                      <button
                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 font-semibold text-[13px] text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-gray-900 dark:text-slate-200 dark:enabled:hover:bg-slate-800"
                        type="button"
                        disabled={isSubmittingReply}
                        onClick={model.cancelReply}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 text-xs transition hover:bg-slate-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800"
                    type="button"
                    onClick={model.startReply}
                  >
                    Ответить
                  </button>
                )}
              </div>
            )}
          </div>

          {(thread.resolved || (thread.resolvable && onResolveThread)) && (
            <div className="flex justify-end gap-2 border-slate-200 border-t px-3.5 py-2.5 dark:border-slate-700">
              {thread.resolved && (
                <button
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 text-xs transition hover:bg-slate-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800"
                  type="button"
                  onClick={toggleExpanded}
                >
                  Свернуть тред
                </button>
              )}
              {thread.resolvable && onResolveThread && (
                <button
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 text-xs transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800"
                  type="button"
                  disabled={resolvingDiscussionId === thread.discussionId}
                  onClick={() =>
                    onResolveThread(thread.discussionId, !thread.resolved)
                  }
                >
                  {resolvingDiscussionId === thread.discussionId
                    ? thread.resolved
                      ? 'Открываем...'
                      : 'Разрешаем...'
                    : thread.resolved
                      ? 'Открыть тред'
                      : 'Разрешить тред'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export const DiffCommentFormRow = withPropsViewModel(
  DiffCommentFormVM,
  ({ model }) => {
    const {
      markdownScope,
      errorMessage,
      isSubmitting,
      rangeLabel,
      onCancel,
      onSubmit,
    } = model.payload;

    const { body, setBody, textareaRef } = model;
    return (
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <div className="border-slate-200 border-t bg-info-surface px-3.5 py-3 dark:border-[var(--color-border-default)]">
          {rangeLabel && (
            <div className="mb-2 font-semibold text-blue-700 text-xs dark:text-blue-300">
              Комментарий к строкам {rangeLabel}
            </div>
          )}
          <GitlabCommentEditor
            inputRef={textareaRef}
            projectId={markdownScope?.projectId ?? null}
            editorClassName="border-info-border"
            placeholder="Напишите комментарий..."
            value={body}
            onChange={setBody}
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
              className="cursor-pointer rounded-lg border border-brand bg-brand px-3.5 py-2 font-semibold text-[13px] text-brand-on enabled:hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={isSubmitting || !body.trim()}
              onClick={() => onSubmit(body)}
            >
              {isSubmitting ? 'Отправка...' : 'Комментировать'}
            </button>
            <button
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 font-semibold text-[13px] text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-gray-900 dark:text-slate-200 dark:enabled:hover:bg-slate-800"
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  },
);
