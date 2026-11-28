import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import type { CloudRequest } from '../../forge/cloud-client';

interface Connection<T> {
  nodes: (T | null)[];
  pageInfo: { endCursor: string | null; hasNextPage: boolean };
}

interface ChangedFile {
  path: string;
  viewerViewedState: 'VIEWED' | 'UNVIEWED' | 'DISMISSED';
}

export interface GithubReviewThread {
  id: string;
  isResolved: boolean;
  viewerCanResolve: boolean;
  viewerCanUnresolve: boolean;
  comments: { nodes: ({ databaseId: number | null } | null)[] };
}

export const createGithubReviewStateApi = (request: CloudRequest) => {
  const graphql = async <T>(
    query: string,
    variables: object,
    signal: AbortSignal,
  ) => {
    const { data } = await request<{ data?: T; errors?: unknown[] }>(
      '/graphql',
      signal,
      { query, variables },
    );
    if (!data.data || data.errors?.length)
      throw new LocalizedError('forge.reviewStateUnavailable');
    return data.data;
  };

  const readAll = async <T, N>(
    id: string,
    query: string,
    select: (node: N) => Connection<T>,
    signal: AbortSignal,
  ) => {
    const nodes: T[] = [];
    const cursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const { node } = await graphql<{ node: N | null }>(
        query,
        { id, cursor },
        signal,
      );
      if (!node) throw new LocalizedError('forge.reviewStateUnavailable');
      const page = select(node);
      nodes.push(
        ...page.nodes.filter((item): item is NonNullable<T> => item != null),
      );
      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      if (!cursor || cursors.has(cursor)) break;
      cursors.add(cursor);
    } while (cursor);
    return nodes;
  };

  return {
    listViewedFiles: async (id: string, signal: AbortSignal) => {
      const files = await readAll<
        ChangedFile,
        { files: Connection<ChangedFile> }
      >(
        id,
        `
        query ViewedFiles($id: ID!, $cursor: String) {
          node(id: $id) {
            ... on PullRequest {
              files(first: 100, after: $cursor) {
                nodes { path viewerViewedState }
                pageInfo { endCursor hasNextPage }
              }
            }
          }
        }`,
        (node) => node.files,
        signal,
      );
      return files.flatMap((file) =>
        file.viewerViewedState === 'VIEWED' ? [file.path] : [],
      );
    },
    listReviewThreads: async (id: string, signal: AbortSignal) => {
      return readAll<
        GithubReviewThread,
        { reviewThreads: Connection<GithubReviewThread> }
      >(
        id,
        `
        query ReviewThreads($id: ID!, $cursor: String) {
          node(id: $id) {
            ... on PullRequest {
              reviewThreads(first: 100, after: $cursor) {
                nodes {
                  id isResolved viewerCanResolve viewerCanUnresolve
                  comments(first: 1) { nodes { databaseId } }
                }
                pageInfo { endCursor hasNextPage }
              }
            }
          }
        }`,
        (node) => node.reviewThreads,
        signal,
      );
    },
    setFileViewed: (
      id: string,
      path: string,
      viewed: boolean,
      signal: AbortSignal,
    ) => {
      const action = viewed ? 'markFileAsViewed' : 'unmarkFileAsViewed';
      return graphql(
        `
        mutation FileViewed($id: ID!, $path: String!) {
          ${action}(input: { pullRequestId: $id, path: $path }) { clientMutationId }
        }`,
        { id, path },
        signal,
      );
    },
    setThreadResolved: async (
      id: string,
      resolved: boolean,
      signal: AbortSignal,
    ) => {
      const action = resolved ? 'resolveReviewThread' : 'unresolveReviewThread';
      const data = await graphql<
        Record<
          string,
          {
            thread: Pick<
              GithubReviewThread,
              'isResolved' | 'viewerCanResolve' | 'viewerCanUnresolve'
            >;
          }
        >
      >(
        `
        mutation ThreadResolved($id: ID!) {
          ${action}(input: { threadId: $id }) {
            thread { isResolved viewerCanResolve viewerCanUnresolve }
          }
        }`,
        { id },
        signal,
      );
      return data[action].thread;
    },
  };
};
