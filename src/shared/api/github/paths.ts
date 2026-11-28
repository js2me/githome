import type { ForgePullRequestRef } from '../forge/contracts';

export const repositoryPath = (id: string) =>
  `/repos/${id.split('/').map(encodeURIComponent).join('/')}`;

export const pullRequestPath = (ref: ForgePullRequestRef) =>
  `${repositoryPath(ref.repositoryId)}/pulls/${ref.number}`;

export const commentsPath = (ref: ForgePullRequestRef) =>
  `${repositoryPath(ref.repositoryId)}/issues/${ref.number}/comments`;
