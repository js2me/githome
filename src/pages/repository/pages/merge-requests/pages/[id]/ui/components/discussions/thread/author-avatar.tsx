import type { GitLabNoteDC } from '@/shared/api/gitlab';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';

export const AuthorAvatar = ({ note }: { note: GitLabNoteDC }) => {
  const authorName = note.author?.name ?? 'Unknown';

  return (
    <GitlabAvatar
      className="h-8 w-8 shrink-0 rounded-full object-cover"
      avatarUrl={note.author?.avatar_url}
      name={authorName}
    />
  );
};
