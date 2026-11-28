import { createMutation, queryClient } from 'mobx-tanstack-query/preset';
import type { ForgeSession } from '@/shared/api/forge/adapter';
import type { ForgePullRequestRef } from '@/shared/api/forge/contracts';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { forgeCommentsKey } from './keys';

type CreateCommentVariables = {
  session: ForgeSession;
  ref: ForgePullRequestRef;
  body: string;
};

export const createForgeCommentMutation = (abortSignal: AbortSignal) =>
  createMutation<void, CreateCommentVariables>(
    async ({ session, ref, body }) => {
      abortSignal.throwIfAborted();
      if (!body.trim()) throw new LocalizedError('review.enterAComment');
      await session.adapter.createComment(ref, body.trim(), abortSignal);
    },
    {
      abortSignal,
      retry: false,
      networkMode: 'always',
      onSuccess: (_data, { session, ref }) =>
        queryClient.invalidateQueries({
          queryKey: forgeCommentsKey(session, ref),
          exact: true,
        }),
    },
  );
