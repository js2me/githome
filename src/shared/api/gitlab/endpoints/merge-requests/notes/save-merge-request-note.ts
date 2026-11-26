import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabPost, gitlabPut } from '../../../client';
import type { GitLabNoteDC } from '../../../data-contracts';

export const saveMergeRequestNote = (
  connection: GitLabConnection,
  projectId: number,
  mergeRequestIid: number,
  body: string,
  noteId?: number,
  signal?: AbortSignal,
): Promise<GitLabNoteDC> => {
  const path = `/projects/${projectId}/merge_requests/${mergeRequestIid}/notes`;
  return noteId === undefined
    ? gitlabPost(connection, path, { body }, signal)
    : gitlabPut(connection, `${path}/${noteId}`, { body }, signal);
};
