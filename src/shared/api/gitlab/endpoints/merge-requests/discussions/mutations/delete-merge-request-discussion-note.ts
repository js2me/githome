import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabDelete } from '../../../../client';
import type { GitLabProjectDC } from '../../../../data-contracts';

export const deleteMergeRequestDiscussionNote = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  discussionId: string,
  noteId: number,
  signal?: AbortSignal,
): Promise<void> => {
  await gitlabDelete(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions/${encodeURIComponent(discussionId)}/notes/${noteId}`,
    signal,
  );
};
