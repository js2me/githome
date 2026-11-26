import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import type {
  GitLabDiscussionDC,
  GitLabProjectDC,
} from '../../../../data-contracts';
import { fetchPaginatedItems } from '../../../../fetch-paginated-items';

export const getMergeRequestDiscussions = async (
  connection: GitLabConnection,
  project: Pick<GitLabProjectDC, 'id'>,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabDiscussionDC[]> => {
  const discussions = await fetchPaginatedItems<GitLabDiscussionDC>(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions`,
    { sort: 'asc' },
    signal,
  );

  return discussions
    .filter((discussion) => {
      if (!Array.isArray(discussion.notes))
        throw new LocalizedError(
          'review.gitlabReturnedIncompleteDiscussionData',
        );
      return discussion.notes.length > 0;
    })
    .sort((left, right) => {
      const leftTime = new Date(left.notes[0].created_at).getTime();
      const rightTime = new Date(right.notes[0].created_at).getTime();
      return leftTime - rightTime;
    });
};
