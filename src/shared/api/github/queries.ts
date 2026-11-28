import type { CloudRequest } from '../forge/cloud-client';
import type {
  ForgeAccount,
  ForgeComment,
  ForgePullRequest,
  ForgeQueries,
  ForgeRepository,
} from '../forge/contracts';
import { commentsPath, pullRequestPath, repositoryPath } from './paths';

interface User {
  login: string;
  name?: string | null;
  avatar_url?: string;
}

interface Repository {
  name: string;
  full_name: string;
  html_url: string;
}

interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: 'open' | 'closed';
  merged?: boolean;
  merged_at?: string | null;
  draft?: boolean;
  user: User | null;
  head: { ref: string };
  base: { ref: string };
}

interface Comment {
  id: number;
  body: string;
  user: User | null;
  created_at: string;
}

const account = (user: User): ForgeAccount => ({
  name: user.name || user.login,
  username: user.login,
  avatarUrl: user.avatar_url,
});

const repository = (repo: Repository): ForgeRepository => ({
  id: repo.full_name,
  name: repo.name,
  path: repo.full_name,
  webUrl: repo.html_url,
});

const pullRequest = (pr: PullRequest): ForgePullRequest => ({
  number: pr.number,
  title: pr.title,
  description: pr.body ?? '',
  webUrl: pr.html_url,
  state: pr.merged || pr.merged_at ? 'merged' : pr.state,
  draft: pr.draft,
  author: pr.user ? account(pr.user) : undefined,
  sourceBranch: pr.head.ref,
  targetBranch: pr.base.ref,
});

const comment = (value: Comment): ForgeComment => ({
  id: String(value.id),
  body: value.body,
  author: value.user ? account(value.user) : undefined,
  createdAt: value.created_at,
});

const nextLink = (headers: Headers) =>
  headers.get('link')?.match(/<([^>]+)>\s*;\s*rel="next"/)?.[1];

export const createGithubQueries = (request: CloudRequest): ForgeQueries => {
  const list = async <T, R>(
    path: string,
    signal: AbortSignal,
    map: (value: T) => R,
  ) => {
    const { data, headers } = await request<T[]>(path, signal);
    if (!Array.isArray(data)) throw new Error('Invalid GitHub list response');
    return { items: data.map(map), nextCursor: nextLink(headers) };
  };

  return {
    getAccount: async (signal) =>
      account((await request<User>('/user', signal)).data),
    listRepositories: (cursor, signal) =>
      list(
        cursor ?? '/user/repos?per_page=30&sort=updated',
        signal,
        repository,
      ),
    listOpenPullRequests: (id, cursor, signal) =>
      list(
        cursor ??
          `${repositoryPath(id)}/pulls?state=open&sort=updated&direction=desc&per_page=30`,
        signal,
        pullRequest,
      ),
    getPullRequest: async (ref, signal) =>
      pullRequest(
        (await request<PullRequest>(pullRequestPath(ref), signal)).data,
      ),
    listComments: (ref, cursor, signal) =>
      list(cursor ?? `${commentsPath(ref)}?per_page=30`, signal, comment),
  };
};
