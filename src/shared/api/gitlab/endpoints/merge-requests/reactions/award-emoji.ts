import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabDelete, gitlabPost } from '../../../client';
import { fetchPaginatedItems } from '../../../fetch-paginated-items';

export type MergeRequestReactionName = 'thumbsup' | 'thumbsdown';

export interface MergeRequestAwardEmoji {
  id: number;
  name: string;
  user: { id: number };
}

export interface MergeRequestReactionTarget {
  projectId: number;
  mergeRequestIid: number;
}

const awardEmojiPath = (target: MergeRequestReactionTarget) =>
  `/projects/${target.projectId}/merge_requests/${target.mergeRequestIid}/award_emoji`;

export const getMergeRequestAwardEmoji = (
  connection: GitLabConnection,
  target: MergeRequestReactionTarget,
  signal?: AbortSignal,
) =>
  fetchPaginatedItems<MergeRequestAwardEmoji>(
    connection,
    awardEmojiPath(target),
    {},
    signal,
  );

export const addMergeRequestAwardEmoji = (
  connection: GitLabConnection,
  target: MergeRequestReactionTarget,
  name: MergeRequestReactionName,
  signal?: AbortSignal,
) =>
  gitlabPost<MergeRequestAwardEmoji>(
    connection,
    awardEmojiPath(target),
    { name },
    signal,
  );

export const deleteMergeRequestAwardEmoji = (
  connection: GitLabConnection,
  target: MergeRequestReactionTarget,
  awardId: number,
  signal?: AbortSignal,
) => gitlabDelete(connection, `${awardEmojiPath(target)}/${awardId}`, signal);
