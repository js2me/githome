import { Pencil, TrashBin } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import type { GitLabNoteDC } from '@/shared/api/gitlab';
import { cn } from '@/shared/lib/cn';
import {
  canEditGitLabNote,
  getDiscussionNoteKey,
} from '@/shared/lib/gitlab/discussions/note-permissions';
import { getLocale, t } from '@/shared/lib/i18n';
import { GitlabCommentEditor } from '@/shared/ui/gitlab-comment-editor';
import { GitLabMarkdown } from '@/shared/ui/gitlab-markdown/gitlab-markdown';
import {
  REVIEWED_FILES_EMOJI,
  readReviewedFiles,
} from '../../../../model/changes/reviewed-files/reviewed-files-note';
import { DiscussionNoteVM } from '../../../../model/merge-request-discussions';
import { AuthorAvatar } from './author-avatar';

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(getLocale(), {
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

export const DiscussionNote = withPropsViewModel(
  DiscussionNoteVM,
  ({ model }) => {
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
    const authorName = note.author?.name ?? t('review.unknown');
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
              <time
                className="text-slate-400 text-xs"
                dateTime={note.created_at}
              >
                {formatDateTime(note.created_at)}
              </time>
              {note.resolvable && note.resolved && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-[11px] text-green-800 uppercase dark:bg-green-950 dark:text-green-300">
                  {t('common.resolved')}
                </span>
              )}
            </div>

            {canEdit && !isEditing && (
              <div className="flex shrink-0 items-center gap-1">
                {onUpdateDiscussionNote && (
                  <button
                    className="inline-flex cursor-pointer items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    type="button"
                    title={t('review.edit')}
                    aria-label={t('review.editComment')}
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
                    title={
                      isDeleting ? t('review.deleting') : t('review.delete')
                    }
                    aria-label={t('review.deleteComment')}
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
              <span>{t('review.file')}</span>
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
                  {isSaving ? t('common.saving2') : t('common.save')}
                </button>
                <button
                  className="glass-control rounded-lg px-3.5 py-2 font-semibold text-[13px]"
                  type="button"
                  disabled={isSaving}
                  onClick={editor.cancel}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <GitLabMarkdown
              {...markdownScope}
              text={
                readReviewedFiles(note.body) ? REVIEWED_FILES_EMOJI : note.body
              }
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
  },
);
