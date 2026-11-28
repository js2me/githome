import { queryClient } from 'mobx-tanstack-query/preset';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import {
  addMergeRequestAwardEmoji,
  deleteMergeRequestAwardEmoji,
  type MergeRequestAwardEmoji,
  type MergeRequestReactionName,
  type MergeRequestReactionTarget,
} from '../endpoints/merge-requests/reactions/award-emoji';
import { reactionKey } from '../queries/merge-requests/reactions';
import { defineGitlabMutation } from './define-mutation';

export const toggleMergeRequestReaction = defineGitlabMutation(
  'toggle-merge-request-reaction',
  async (
    connection: GitLabConnection,
    target: MergeRequestReactionTarget,
    name: MergeRequestReactionName,
    existingId: number | undefined,
    signal: AbortSignal,
  ) => {
    const key = reactionKey(connection, target);
    const created =
      existingId === undefined
        ? await addMergeRequestAwardEmoji(connection, target, name, signal)
        : await deleteMergeRequestAwardEmoji(
            connection,
            target,
            existingId,
            signal,
          );

    // A poll started before the write could otherwise overwrite the new state.
    await queryClient.cancelQueries({ queryKey: key, exact: true });
    queryClient.setQueryData<MergeRequestAwardEmoji[]>(key, (awards) =>
      created
        ? [...(awards ?? []).filter(({ id }) => id !== created.id), created]
        : awards?.filter(({ id }) => id !== existingId),
    );
  },
);

export const invalidateMergeRequestReactions = (
  connection: GitLabConnection,
  target: MergeRequestReactionTarget,
) =>
  queryClient.invalidateQueries({
    queryKey: reactionKey(connection, target),
    exact: true,
  });
