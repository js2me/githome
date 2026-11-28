export type ForgeProvider = 'gitlab' | 'github' | 'bitbucket';

export interface ForgeAccount {
  name: string;
  username?: string;
  avatarUrl?: string | null;
}

export interface ForgeRepository {
  /** Opaque provider identifier used to address the repository. */
  id: string;
  name: string;
  path: string;
  webUrl: string;
}

export type ForgePullRequestFilter = 'opened' | 'mine' | 'merged' | 'closed';

export interface ForgePullRequest {
  number: number;
  title: string;
  description: string;
  webUrl: string;
  state: 'open' | 'merged' | 'closed';
  draft?: boolean;
  updatedAt?: string;
  revision?: { head: string; base: string; headRepository?: string };
  changedFiles?: number;
  nodeId?: string;
  author?: ForgeAccount;
  sourceBranch: string;
  targetBranch: string;
}

export interface ForgeComment {
  id: string;
  body: string;
  author?: ForgeAccount;
  createdAt: string;
}

export interface ForgePage<T> {
  items: T[];
  nextCursor?: string;
}

export interface ForgePullRequestRef {
  repositoryId: string;
  number: number;
}

export interface ForgeQueries {
  getAccount(signal: AbortSignal): Promise<ForgeAccount>;
  listRepositories(
    cursor: string | undefined,
    signal: AbortSignal,
  ): Promise<ForgePage<ForgeRepository>>;
  listOpenPullRequests(
    repositoryId: string,
    cursor: string | undefined,
    signal: AbortSignal,
  ): Promise<ForgePage<ForgePullRequest>>;
  getPullRequest(
    ref: ForgePullRequestRef,
    signal: AbortSignal,
  ): Promise<ForgePullRequest>;
  listComments(
    ref: ForgePullRequestRef,
    cursor: string | undefined,
    signal: AbortSignal,
  ): Promise<ForgePage<ForgeComment>>;
}

export interface ForgeMutations {
  createComment(
    ref: ForgePullRequestRef,
    body: string,
    signal: AbortSignal,
  ): Promise<ForgeComment>;
}

export type ForgeAdapter = ForgeQueries & ForgeMutations;
