import { type CloudRequest, CloudRequestError } from '../forge/cloud-client';
import type {
  ForgePullRequest,
  ForgePullRequestFilter,
  ForgeQueries,
  ForgeRepository,
} from '../forge/contracts';
import { mapAccount, mapComment, type User } from './comment';
import { commentsPath, pullRequestPath, repositoryPath } from './paths';
import { githubList } from './workspace/list';
import { searchGithubPullRequests } from './workspace/pull-request-search';

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
  updated_at?: string;
  changed_files?: number;
  node_id?: string;
  head: { ref: string; sha?: string; repo?: { full_name: string } | null };
  base: { ref: string; sha?: string };
}

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
  updatedAt: pr.updated_at,
  changedFiles: pr.changed_files,
  nodeId: pr.node_id,
  revision:
    pr.head.sha && pr.base.sha
      ? {
          head: pr.head.sha,
          base: pr.base.sha,
          headRepository: pr.head.repo?.full_name,
        }
      : undefined,
  author: pr.user ? mapAccount(pr.user) : undefined,
  sourceBranch: pr.head.ref,
  targetBranch: pr.base.ref,
});

export const createGithubQueries = (request: CloudRequest) => {
  const list = async <T, R>(
    path: string,
    signal: AbortSignal,
    map: (value: T) => R,
  ) => {
    const page = await githubList<T>(request, path, signal);
    return { ...page, items: page.items.map(map) };
  };

  const queries: ForgeQueries = {
    getAccount: async (signal) =>
      mapAccount((await request<User>('/user', signal)).data),
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
      list(cursor ?? `${commentsPath(ref)}?per_page=30`, signal, mapComment),
  };

  const searchPage = async (
    id: string,
    filter: ForgePullRequestFilter,
    username: string | undefined,
    search: string,
    cursor: string | undefined,
    signal: AbortSignal,
  ) => {
    const graphqlCursor = cursor?.startsWith('search:')
      ? cursor.slice('search:'.length)
      : undefined;
    if (search && (!cursor || graphqlCursor)) {
      try {
        const result = await searchGithubPullRequests(
          request,
          id,
          filter,
          username,
          search,
          graphqlCursor,
          signal,
        );
        if (result)
          return {
            items: result.items,
            nextCursor: result.nextCursor
              ? `search:${result.nextCursor}`
              : undefined,
          };
      } catch (error) {
        if (
          !(error instanceof CloudRequestError) ||
          ![401, 403].includes(error.status) ||
          graphqlCursor
        )
          throw error;
      }
      if (graphqlCursor)
        throw new Error('GitHub pull request search is unavailable');
    }
    return null;
  };

  return {
    ...queries,
    listPullRequests: async (
      id: string,
      filter: ForgePullRequestFilter,
      username: string | undefined,
      search: string,
      cursor: string | undefined,
      signal: AbortSignal,
    ) => {
      const number = Number(/^#?([1-9]\d*)$/.exec(search)?.[1]);
      const searchTitle = search.toLowerCase();
      const matches = (pr: ForgePullRequest) =>
        (filter === 'mine'
          ? pr.author?.username === username
          : pr.state === (filter === 'opened' ? 'open' : filter)) &&
        (!search ||
          Number.isSafeInteger(number) ||
          pr.title.toLowerCase().includes(searchTitle));
      if (Number.isSafeInteger(number)) {
        try {
          const item = await queries.getPullRequest(
            { repositoryId: id, number },
            signal,
          );
          return { items: matches(item) ? [item] : [], nextCursor: undefined };
        } catch (error) {
          if (error instanceof CloudRequestError && error.status === 404)
            return { items: [], nextCursor: undefined };
          throw error;
        }
      }
      const found = await searchPage(
        id,
        filter,
        username,
        search,
        cursor,
        signal,
      );
      if (found) return { ...found, items: found.items.filter(matches) };
      const state =
        filter === 'opened' ? 'open' : filter === 'mine' ? 'all' : 'closed';
      const page = await list(
        cursor ??
          `${repositoryPath(id)}/pulls?state=${state}&sort=updated&direction=desc&per_page=30`,
        signal,
        pullRequest,
      );
      return { ...page, items: page.items.filter(matches) };
    },
  };
};
