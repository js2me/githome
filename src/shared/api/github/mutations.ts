import type { CloudRequest } from '../forge/cloud-client';
import type { ForgeMutations } from '../forge/contracts';
import { commentsPath } from './paths';

export const createGithubMutations = (
  request: CloudRequest,
): ForgeMutations => ({
  createComment: async (ref, body, signal) => {
    await request(commentsPath(ref), signal, { body });
  },
});
