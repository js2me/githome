import type {
  MergeRequestAwardEmoji,
  MergeRequestReactionTarget,
} from '@/shared/api/gitlab/endpoints/merge-requests/reactions/award-emoji';
import { getMergeRequestAwardEmoji } from '@/shared/api/gitlab/endpoints/merge-requests/reactions/award-emoji';
import { defineGitlabApiQuery } from '@/shared/api/gitlab/queries/core/define-query';
import { mergeRequestDetailKey } from '@/shared/api/gitlab/queries/merge-requests/detail-key';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';

export const createMergeRequestReactionsQuery = defineGitlabApiQuery<
  MergeRequestAwardEmoji[],
  MergeRequestReactionTarget
>({
  queryKey: ({ connection, ...target }) => reactionKey(connection, target),
  queryFn: ({ connection, signal, ...target }) =>
    getMergeRequestAwardEmoji(connection, target, signal),
  queryOptions: {
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    retry: false,
  },
});

export const reactionKey = (
  connection: GitLabConnection,
  { projectId, mergeRequestIid }: MergeRequestReactionTarget,
) =>
  [
    ...mergeRequestDetailKey(connection, projectId, mergeRequestIid),
    'reactions',
  ] as const;
