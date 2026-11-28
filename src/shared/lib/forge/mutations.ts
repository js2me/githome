import { createMutation, queryClient } from 'mobx-tanstack-query/preset';
import type { ForgeSession } from '@/shared/api/forge/adapter';
import type {
  ForgeComment,
  ForgePullRequestRef,
} from '@/shared/api/forge/contracts';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { forgePostedCommentsKey } from './keys';

type CreateCommentVariables = {
  session: ForgeSession;
  ref: ForgePullRequestRef;
  body: string;
};

export const createForgeCommentMutation = (abortSignal: AbortSignal) =>
  createMutation<ForgeComment, CreateCommentVariables>(
    async ({ session, ref, body }) => {
      abortSignal.throwIfAborted();
      if (!body.trim()) throw new LocalizedError('review.enterAComment');
      return session.adapter.createComment(ref, body.trim(), abortSignal);
    },
    {
      abortSignal,
      retry: false,
      networkMode: 'always',
      onSuccess: (comment, { session, ref }) => {
        queryClient.setQueryData<ForgeComment[]>(
          forgePostedCommentsKey(session, ref),
          (previous) => [
            ...(previous ?? []).filter(({ id }) => id !== comment.id),
            comment,
          ],
        );
      },
    },
  );
