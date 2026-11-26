import { withPropsViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { GitlabCommentEditor } from '@/shared/ui/gitlab-comment-editor';
import { DiffThreadVM } from '../../../model/discussion-rows';
import { InlineThreadNote } from './inline-thread-note';
import { ResolvedThreadAvatar } from './resolved-thread-avatar';

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
    ? (firstNote.author?.name ?? t('review.unknown'))
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
                      placeholder={t('diff.writeAReply')}
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
                        {isSubmittingReply
                          ? t('review.posting')
                          : t('diff.reply')}
                      </button>
                      <button
                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 font-semibold text-[13px] text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-gray-900 dark:text-slate-200 dark:enabled:hover:bg-slate-800"
                        type="button"
                        disabled={isSubmittingReply}
                        onClick={model.cancelReply}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 text-xs transition hover:bg-slate-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800"
                    type="button"
                    onClick={model.startReply}
                  >
                    {t('diff.reply')}
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
                  {t('diff.collapseThread')}
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
                      ? t('review.reopening')
                      : t('review.resolving')
                    : thread.resolved
                      ? t('review.reopenThread')
                      : t('review.resolveThread')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
