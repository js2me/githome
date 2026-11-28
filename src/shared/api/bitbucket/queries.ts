import type { CloudRequest } from '../forge/cloud-client';
import type {
  ForgePullRequest,
  ForgeQueries,
  ForgeRepository,
} from '../forge/contracts';
import { mapAccount, type User } from './comment';
import { listGeneralComments } from './comment-list';
import { fetchBitbucketPage } from './page';
import { pullRequestPath, repositoryPath } from './paths';

interface Repository {
  name: string;
  full_name: string;
  links: { html: { href: string } };
}

interface PullRequest {
  id: number;
  title: string;
  description?: string;
  links: { html: { href: string } };
  state: string;
  draft?: boolean;
  author?: User;
  source: { branch: { name: string } };
  destination: { branch: { name: string } };
}

const repository = (repo: Repository): ForgeRepository => ({
  id: repo.full_name,
  name: repo.name,
  path: repo.full_name,
  webUrl: repo.links.html.href,
});

const pullRequest = (pr: PullRequest): ForgePullRequest => ({
  number: pr.id,
  title: pr.title,
  description: pr.description ?? '',
  webUrl: pr.links.html.href,
  state:
    pr.state === 'OPEN' ? 'open' : pr.state === 'MERGED' ? 'merged' : 'closed',
  draft: pr.draft,
  author: pr.author ? mapAccount(pr.author) : undefined,
  sourceBranch: pr.source.branch.name,
  targetBranch: pr.destination.branch.name,
});

export const createBitbucketQueries = (
  request: CloudRequest,
  workspace: string,
): ForgeQueries => {
  const list = async <T, R>(
    path: string,
    signal: AbortSignal,
    map: (value: T) => R,
  ) => {
    const { values, next } = await fetchBitbucketPage<T>(request, path, signal);
    return { items: values.map(map), nextCursor: next };
  };

  return {
    getAccount: async (signal) =>
      mapAccount((await request<User>('/2.0/user', signal)).data),
    listRepositories: (cursor, signal) =>
      list(
        cursor ?? `${repositoryPath(workspace)}?pagelen=30`,
        signal,
        repository,
      ),
    listOpenPullRequests: (id, cursor, signal) =>
      list(
        cursor ??
          `${repositoryPath(id)}/pullrequests?state=OPEN&sort=-updated_on&pagelen=30`,
        signal,
        pullRequest,
      ),
    getPullRequest: async (ref, signal) =>
      pullRequest(
        (await request<PullRequest>(pullRequestPath(ref), signal)).data,
      ),
    listComments: (ref, cursor, signal) =>
      listGeneralComments(request, ref, cursor, signal),
  };
};
