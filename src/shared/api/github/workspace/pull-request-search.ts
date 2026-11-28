import type { CloudRequest } from '../../forge/cloud-client';
import type {
  ForgePage,
  ForgePullRequest,
  ForgePullRequestFilter,
} from '../../forge/contracts';

const stateQualifiers = {
  opened: 'is:open',
  merged: 'is:merged',
  closed: 'is:closed is:unmerged',
  mine: '',
} satisfies Record<ForgePullRequestFilter, string>;

interface SearchResult {
  number: number;
  title: string;
  updatedAt: string;
  id: string;
  body: string;
  url: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  isDraft: boolean;
  headRefName: string;
  baseRefName: string;
  author: { login: string; name?: string | null; avatarUrl?: string } | null;
}

interface GraphqlSearchResponse {
  data?: {
    search: {
      nodes: (SearchResult | null)[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
  errors?: unknown[];
}

export async function searchGithubPullRequests(
  request: CloudRequest,
  repository: string,
  filter: ForgePullRequestFilter,
  username: string | undefined,
  title: string,
  cursor: string | undefined,
  signal: AbortSignal,
): Promise<ForgePage<ForgePullRequest> | null> {
  const phrase = title.replace(/["\\]/g, ' ').trim();
  if (!phrase || !/^[\w.-]+\/[\w.-]+$/.test(repository)) return null;
  const author = filter === 'mine' && username ? `author:${username}` : '';
  const search = `repo:${repository} is:pr ${stateQualifiers[filter]} ${author} in:title "${phrase}" sort:updated-desc`;

  const { data } = await request<GraphqlSearchResponse>('/graphql', signal, {
    query: `
      query SearchPullRequests($search: String!, $cursor: String) {
        search(type: ISSUE, query: $search, first: 30, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            ... on PullRequest {
              id number title body url state isDraft updatedAt headRefName baseRefName
              author { login avatarUrl ... on User { name } }
            }
          }
        }
      }`,
    variables: { search, cursor: cursor ?? null },
  });

  if (!data.data || data.errors?.length) return null;
  const { nodes, pageInfo } = data.data.search;
  return {
    items: nodes.flatMap((pr) =>
      pr?.number
        ? [
            {
              number: pr.number,
              title: pr.title,
              description: pr.body,
              webUrl: pr.url,
              nodeId: pr.id,
              state:
                pr.state === 'MERGED'
                  ? 'merged'
                  : pr.state === 'CLOSED'
                    ? 'closed'
                    : 'open',
              draft: pr.isDraft,
              updatedAt: pr.updatedAt,
              sourceBranch: pr.headRefName,
              targetBranch: pr.baseRefName,
              author: pr.author
                ? {
                    name: pr.author.name || pr.author.login,
                    username: pr.author.login,
                    avatarUrl: pr.author.avatarUrl,
                  }
                : undefined,
            },
          ]
        : [],
    ),
    nextCursor: pageInfo.hasNextPage
      ? (pageInfo.endCursor ?? undefined)
      : undefined,
  };
}
