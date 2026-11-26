import { observer } from 'mobx-react-lite';
import type { GitLabNoteDC } from '@/shared/api/gitlab';
import { t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';

export const AuthorAvatar = observer(({ note }: { note: GitLabNoteDC }) => {
  const authorName = note.author?.name ?? t('review.unknown');

  return (
    <GitlabAvatar
      className="h-8 w-8 shrink-0 rounded-full object-cover"
      avatarUrl={note.author?.avatar_url}
      name={authorName}
    />
  );
});
