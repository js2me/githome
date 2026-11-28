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
  display_name: string;
  nickname?: string;
  links?: { avatar?: { href: string } };
}

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

interface Comment {
  id: number;
  content?: { raw?: string };
  deleted?: boolean;
  user?: User;
  created_on: string;
}

const account = (user: User): ForgeAccount => ({
  name: user.display_name,
  username: user.nickname,
  avatarUrl: user.links?.avatar?.href,
});

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
  author: pr.author ? account(pr.author) : undefined,
  sourceBranch: pr.source.branch.name,
  targetBranch: pr.destination.branch.name,
});

const comment = (value: Comment): ForgeComment => ({
  id: String(value.id),
  body: value.content?.raw ?? '',
  author: value.user ? account(value.user) : undefined,
  createdAt: value.created_on,
});

export const createBitbucketQueries = (
  request: CloudRequest,
  workspace: string,
): ForgeQueries => {
  const list = async <T, R>(
    path: string,
    signal: AbortSignal,
    map: (value: T) => R,
    include?: (value: T) => boolean,
  ) => {
    const { data } = await request<{ values: T[]; next?: string }>(
      path,
      signal,
    );
    if (!Array.isArray(data.values))
      throw new Error('Invalid Bitbucket list response');
    return {
      items: (include ? data.values.filter(include) : data.values).map(map),
      nextCursor: data.next,
    };
  };

  return {
    getAccount: async (signal) =>
      account((await request<User>('/2.0/user', signal)).data),
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
      list(
        cursor ?? `${commentsPath(ref)}?pagelen=30`,
        signal,
        comment,
        (value) => !value.deleted,
      ),
  };
};
