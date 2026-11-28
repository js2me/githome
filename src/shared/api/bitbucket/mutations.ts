import type { CloudRequest } from '../forge/cloud-client';
import type { ForgeMutations } from '../forge/contracts';
import { commentsPath } from './paths';

export const createBitbucketMutations = (
  request: CloudRequest,
): ForgeMutations => ({
  createComment: async (ref, body, signal) => {
    await request(commentsPath(ref), signal, { content: { raw: body } });
  },
});
