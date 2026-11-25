import { Pencil, TrashBin } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import type { GitLabDiscussionDC, GitLabNoteDC } from '@/shared/api/gitlab';
import { cn } from '@/shared/lib/cn';
import { isDiscussionResolvable } from '@/shared/lib/gitlab/diff-discussions';
import {
  canEditGitLabNote,
  getDiscussionNoteKey,
} from '@/shared/lib/gitlab/note-permissions';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import { GitlabCommentEditor } from '@/shared/ui/gitlab-comment-editor';
import { GitLabMarkdown } from '@/shared/ui/gitlab-markdown/gitlab-markdown';
import { StatusMessage } from '@/shared/ui/status-message';
import {
  DiscussionNoteVM,
  type DiscussionsProps,
  DiscussionThreadVM,
} from '../../model/merge-request-discussions';
import { DiscussionResolveActions } from './discussion-resolve-actions';

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPosition = (note: GitLabNoteDC) => {
  if (note.type !== 'DiffNote' || !note.position) {
    return null;
  }

  const path = note.position.new_path ?? note.position.old_path;
  if (!path) {
    return null;
  }

  const line = note.position.new_line ?? note.position.old_line;
  return line ? `${path}:${line}` : path;
};

const AuthorAvatar = ({ note }: { note: GitLabNoteDC }) => {
  const authorName = note.author?.name ?? 'Unknown';

  return (
    <GitlabAvatar
      className="h-8 w-8 shrink-0 rounded-full object-cover"
      avatarUrl={note.author?.avatar_url}
      name={authorName}
    />
  );
};

const DiscussionNote = withPropsViewModel(DiscussionNoteVM, ({ model }) => {
  const {
    markdownScope,
    note,
    discussionId,
    isReply,
    currentUserId = null,
    onUpdateDiscussionNote,
    onDeleteDiscussionNote,
    updatingNoteKey,
    deletingNoteKey,
    updateNoteError,
    deleteNoteErrorKey,
    deleteNoteError,
  } = model.payload;
  const { editor } = model;
  const { isEditing, editBody } = editor;
  const position = formatPosition(note);
  const authorName = note.author?.name ?? 'Unknown';
  const authorUsername = note.author?.username ?? '';
  const canEdit = canEditGitLabNote(note, currentUserId);
  const noteKey = getDiscussionNoteKey(discussionId, note.id);
  const isSaving = updatingNoteKey === noteKey;
  const isDeleting = deletingNoteKey === noteKey;
  const noteDeleteError =
    deleteNoteErrorKey === noteKey ? deleteNoteError : null;
  return (
    <article
      className={cn(
        'flex gap-3 px-4 py-3.5',
        note.system && 'bg-[var(--glass-control)]',
        isReply && 'pt-0 pb-3.5 pl-[52px]',
      )}
    >
      <AuthorAvatar note={note} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <header className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="font-bold text-slate-900 text-sm dark:text-slate-200">
              {authorName}
            </span>
            {authorUsername && (
              <span className="text-[13px] text-slate-500">
                @{authorUsername}
              </span>
            )}
            <time className="text-slate-400 text-xs" dateTime={note.created_at}>
              {formatDateTime(note.created_at)}
            </time>
            {note.resolvable && note.resolved && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-[11px] text-green-800 uppercase dark:bg-green-950 dark:text-green-300">
                Resolved
              </span>
            )}
          </div>

          {canEdit && !isEditing && (
            <div className="flex shrink-0 items-center gap-1">
              {onUpdateDiscussionNote && (
                <button
                  className="inline-flex cursor-pointer items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  type="button"
                  title="Редактировать"
                  aria-label="Редактировать комментарий"
                  disabled={Boolean(updatingNoteKey || deletingNoteKey)}
                  onClick={editor.start}
                >
                  <Pencil width={14} height={14} />
                </button>
              )}
              {onDeleteDiscussionNote && (
                <button
                  className="inline-flex cursor-pointer items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-300"
                  type="button"
                  title={isDeleting ? 'Удаление...' : 'Удалить'}
                  aria-label="Удалить комментарий"
                  disabled={Boolean(updatingNoteKey || deletingNoteKey)}
                  onClick={() => void editor.remove()}
                >
                  <TrashBin width={14} height={14} />
                </button>
              )}
            </div>
          )}
        </header>

        {position && (
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <span>на</span>
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700 text-xs dark:bg-slate-800 dark:text-slate-200">
              {position}
            </code>
          </div>
        )}

        {isEditing ? (
          <div>
            <GitlabCommentEditor
              projectId={markdownScope.projectId}
              className="text-sm"
              value={editBody}
              onChange={editor.changeBody}
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
                className="glass-primary rounded-lg px-3.5 py-2 font-semibold text-[13px]"
                type="button"
                disabled={isSaving || !editBody.trim()}
                onClick={() => {
                  void editor.save();
                }}
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                className="glass-control rounded-lg px-3.5 py-2 font-semibold text-[13px]"
                type="button"
                disabled={isSaving}
                onClick={editor.cancel}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <GitLabMarkdown
            {...markdownScope}
            text={note.body}
            className="min-w-0 max-w-full text-slate-800 dark:text-slate-300"
            italic={note.system}
          />
        )}

        {noteDeleteError && (
          <div className="text-[13px] text-red-700 dark:text-red-300">
            {noteDeleteError}
          </div>
        )}
      </div>
    </article>
  );
});

const DiscussionThread = withPropsViewModel(DiscussionThreadVM, ({ model }) => {
  const {
    discussion,
    onResolveDiscussion,
    resolvingDiscussionId,
    ...noteProps
  } = model.payload;
  const [firstNote, ...replies] = discussion.notes;
  const { resolved, expanded } = model;
  const resolvable = isDiscussionResolvable(discussion);

  if (!firstNote) {
    return null;
  }

  return (
    <section
      className={cn(
        'glass-panel overflow-hidden rounded-xl',
        resolved && 'border-green-200 dark:border-green-900',
      )}
    >
      {resolved && (
        <div className="flex items-center justify-between gap-3 border-green-200 border-b bg-green-50 px-3.5 py-2 font-bold text-green-800 text-xs dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          <span>Тред разрешён</span>
          <button
            className="glass-control rounded-md px-2 py-1 font-semibold text-[11px] text-green-800 dark:text-green-300"
            type="button"
            aria-expanded={expanded}
            onClick={model.toggle}
          >
            {expanded ? 'Скрыть' : 'Показать'}
          </button>
        </div>
      )}

      {expanded && (
        <>
          <DiscussionNote
            key={firstNote.id}
            {...noteProps}
            note={firstNote}
            discussionId={discussion.id}
            isReply={false}
          />

          {replies.length > 0 && (
            <div className="flex flex-col gap-3 pb-3.5">
              {replies.map((note) => (
                <DiscussionNote
                  key={note.id}
                  {...noteProps}
                  note={note}
                  discussionId={discussion.id}
                  isReply
                />
              ))}
            </div>
          )}

          <DiscussionResolveActions
            discussionId={discussion.id}
            resolved={resolved}
            resolvable={resolvable}
            isResolving={resolvingDiscussionId === discussion.id}
            onResolve={onResolveDiscussion}
            className="border-slate-200 border-t px-4 py-3 dark:border-slate-800"
          />
        </>
      )}
    </section>
  );
});

export const MergeRequestDiscussions = ({
  discussions,
  ...threadProps
}: DiscussionsProps & { discussions: GitLabDiscussionDC[] }) => {
  if (discussions.length === 0) {
    return <StatusMessage>Комментариев пока нет.</StatusMessage>;
  }

  return (
    <div className="flex flex-col gap-3">
      {discussions.map((discussion) => (
        <DiscussionThread
          key={discussion.id}
          {...threadProps}
          discussion={discussion}
        />
      ))}
    </div>
  );
};
