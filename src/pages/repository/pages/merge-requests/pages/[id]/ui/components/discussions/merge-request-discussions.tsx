import type { GitLabDiscussionDC } from '@/shared/api/gitlab';
import { StatusMessage } from '@/shared/ui/status-message';
import type { DiscussionsProps } from '../../../model/merge-request-discussions';
import { DiscussionThread } from './thread/discussion-thread';

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
