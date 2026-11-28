import type { ForgePullRequestRef } from '../forge/contracts';

export const repositoryPath = (id: string) =>
  `/2.0/repositories/${id.split('/').map(encodeURIComponent).join('/')}`;

export const pullRequestPath = (ref: ForgePullRequestRef) =>
  `${repositoryPath(ref.repositoryId)}/pullrequests/${ref.number}`;

export const commentsPath = (ref: ForgePullRequestRef) =>
  `${pullRequestPath(ref)}/comments`;
