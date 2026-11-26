import { Pencil, TrashBin } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import {
  canEditGitLabNote,
  getDiscussionNoteKey,
} from '@/shared/lib/gitlab/discussions/note-permissions';
import { getLocale, t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import { GitlabCommentEditor } from '@/shared/ui/gitlab-comment-editor';
import { GitLabMarkdown } from '@/shared/ui/gitlab-markdown/gitlab-markdown';
import { InlineNoteVM } from '../../../model/discussion-rows';

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  const relativeTime = new Intl.RelativeTimeFormat(getLocale());
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return t('diff.justNow');
  }

  if (diffMinutes < 60) {
    return relativeTime.format(-diffMinutes, 'minute');
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return relativeTime.format(-diffHours, 'hour');
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return relativeTime.format(-diffDays, 'day');
  }

  return date.toLocaleString(getLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const InlineThreadNote = withPropsViewModel(
  InlineNoteVM,
  ({ model }) => {
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

    const authorName = note.author?.name ?? t('review.unknown');
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
              <time
                className="text-slate-400 text-xs"
                dateTime={note.created_at}
              >
                {formatRelativeTime(note.created_at)}
              </time>
            </div>

            {canEdit && !isEditing && (
              <div className="flex shrink-0 items-center gap-1">
                {onUpdateNote && (
                  <button
                    className="inline-flex cursor-pointer items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    type="button"
                    title={t('review.edit')}
                    aria-label={t('review.editComment')}
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
                    title={
                      isDeleting ? t('review.deleting') : t('review.delete')
                    }
                    aria-label={t('review.deleteComment')}
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
              {t('common.resolved2')} {formatRelativeTime(note.updated_at)} —{' '}
              {resolvedBy}
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
                  {isSaving ? t('common.saving2') : t('common.save')}
                </button>
                <button
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 font-semibold text-[13px] text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-gray-900 dark:text-slate-200 dark:enabled:hover:bg-slate-800"
                  type="button"
                  disabled={isSaving}
                  onClick={handleCancelEdit}
                >
                  {t('common.cancel')}
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
  },
);
