import type { GitLabConnectionItem } from '../../forge/connection';
import type {
  ForgeAccount,
  ForgeAdapter,
  ForgeComment,
  ForgePullRequest,
  ForgePullRequestRef,
} from '../../forge/contracts';
import { buildGitlabPath, gitlabFetch, gitlabPost } from '../client';
import type {
  GitLabMergeRequestDC,
  GitLabNoteDC,
  GitLabProjectDC,
} from '../data-contracts';
import { getGitlabForgeAccount } from '../endpoints/get-current-user';
import { getMergeRequestDetail } from '../endpoints/merge-requests/get-merge-request-detail';

const PER_PAGE = 30;
const projectPath = (id: string) => `/projects/${encodeURIComponent(id)}`;
const commentsPath = (ref: ForgePullRequestRef) =>
  `${projectPath(ref.repositoryId)}/merge_requests/${ref.number}/notes`;

const account = (user?: {
  username?: string;
  name?: string;
  avatar_url?: string | null;
}): ForgeAccount | undefined =>
  user
    ? {
        name: user.name || user.username || '',
        username: user.username,
        avatarUrl: user.avatar_url,
      }
    : undefined;

const pullRequest = (mr: GitLabMergeRequestDC): ForgePullRequest => ({
  number: mr.iid,
  title: mr.title,
  description: mr.description ?? '',
  webUrl: mr.web_url,
  state:
    mr.state === 'opened'
      ? 'open'
      : mr.state === 'merged'
        ? 'merged'
        : 'closed',
  draft: mr.draft ?? mr.work_in_progress,
  author: account(mr.author),
  sourceBranch: mr.source_branch,
  targetBranch: mr.target_branch,
});

const comment = (note: GitLabNoteDC): ForgeComment => ({
  id: String(note.id),
  body: note.body,
  author: account(note.author),
  createdAt: note.created_at,
});

export const createGitlabAdapter = (
  connection: GitLabConnectionItem,
): ForgeAdapter => {
  const list = async <T>(
    path: string,
    query: Record<string, string | boolean>,
    cursor: string | undefined,
    signal: AbortSignal,
  ) => {
    const page = cursor ?? '1';
    const response = await gitlabFetch(
      connection,
      buildGitlabPath(path, { ...query, page, per_page: PER_PAGE }),
      signal,
    );
    const items = (await response.json()) as T[];
    if (!Array.isArray(items)) throw new Error('Invalid GitLab list response');
    const next = response.headers.get('x-next-page');
    return {
      items,
      nextCursor:
        next === null && items.length === PER_PAGE
          ? String(Number(page) + 1)
          : next || undefined,
    };
  };

  return {
    getAccount: (signal) => getGitlabForgeAccount(connection, signal),
    listRepositories: async (cursor, signal) => {
      const page = await list<GitLabProjectDC>(
        '/projects',
        { membership: true, order_by: 'last_activity_at' },
        cursor,
        signal,
      );
      return {
        ...page,
        items: page.items.map((repo) => ({
          id: String(repo.id),
          name: repo.name,
          path: repo.path_with_namespace,
          webUrl: repo.web_url,
        })),
      };
    },
    listOpenPullRequests: async (id, cursor, signal) => {
      const page = await list<GitLabMergeRequestDC>(
        `${projectPath(id)}/merge_requests`,
        { state: 'opened', order_by: 'updated_at' },
        cursor,
        signal,
      );
      return { ...page, items: page.items.map(pullRequest) };
    },
    getPullRequest: async (ref, signal) =>
      pullRequest(
        await getMergeRequestDetail(
          connection,
          ref.repositoryId,
          ref.number,
          signal,
        ),
      ),
    listComments: async (ref, cursor, signal) => {
      const page = await list<GitLabNoteDC>(
        commentsPath(ref),
        { sort: 'asc', order_by: 'created_at' },
        cursor,
        signal,
      );
      return {
        ...page,
        items: page.items.filter((note) => !note.system).map(comment),
      };
    },
    createComment: async (ref, body, signal) => {
      return comment(
        await gitlabPost<GitLabNoteDC>(
          connection,
          commentsPath(ref),
          { body },
          signal,
        ),
      );
    },
  };
};
