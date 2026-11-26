import { withPropsViewModel } from 'mobx-view-model-react';
import { createPortal } from 'react-dom';
import { t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import { ThreadAvatarVM } from '../../../model/discussion-rows';

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

    const authorName = firstNote.author?.name ?? t('review.unknown');
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
          aria-label={t('diff.resolvedComment', { v1: authorName })}
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
