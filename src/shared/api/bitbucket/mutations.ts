import type { CloudRequest } from '../forge/cloud-client';
import type { ForgeMutations } from '../forge/contracts';
import { type Comment, mapComment } from './comment';
import { commentsPath } from './paths';

export const createBitbucketMutations = (
  request: CloudRequest,
): ForgeMutations => ({
  createComment: async (ref, body, signal) => {
    const { data } = await request<Comment>(commentsPath(ref), signal, {
      content: { raw: body },
    });
    return mapComment(data);
  },
});
