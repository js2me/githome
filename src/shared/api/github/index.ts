import type { CloudCredentials } from '../forge/connection';
import { createGithubClient } from './client';
import { createGithubMutations } from './mutations';
import { createGithubQueries } from './queries';
import { createGithubRepositoryApi } from './workspace/repository';
import { createGithubReviewApi } from './workspace/review';
import { createGithubReviewStateApi } from './workspace/review-state';

export const createGithubAdapter = (
  connection: Extract<CloudCredentials, { provider: 'github' }>,
) => {
  const request = createGithubClient(connection);
  return {
    ...createGithubQueries(request),
    ...createGithubMutations(request),
    ...createGithubRepositoryApi(request),
    ...createGithubReviewApi(request),
    ...createGithubReviewStateApi(request),
  };
};

export type GithubAdapter = ReturnType<typeof createGithubAdapter>;
