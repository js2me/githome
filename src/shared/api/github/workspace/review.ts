import type {
  GitLabDiscussionDC,
  GitLabNoteDC,
  GitLabNotePositionDC,
} from '@/shared/api/gitlab';
import type { CreateDiffCommentInput } from '@/shared/lib/gitlab/discussions/diff-comment';
import type { CloudRequest } from '../../forge/cloud-client';
import type { ForgePullRequestRef } from '../../forge/contracts';
import type { Comment, User } from '../comment';
import { pullRequestPath } from '../paths';
import {
  type GithubChangedFile,
  githubCommentPayload,
  mapGithubChange,
} from './diff';
import { githubList } from './list';

export interface GithubReviewComment extends Comment {
  path: string;
  line?: number | null;
  start_line?: number | null;
  side?: 'LEFT' | 'RIGHT';
  start_side?: 'LEFT' | 'RIGHT' | null;
  in_reply_to_id?: number;
  updated_at?: string;
  position?: number | null;
  subject_type?: 'line' | 'file';
}

export type GithubReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';

export interface GithubReview {
  id: number;
  user: User | null;
  body: string | null;
  state:
    | 'APPROVED'
    | 'CHANGES_REQUESTED'
    | 'COMMENTED'
    | 'DISMISSED'
    | 'PENDING';
  submitted_at?: string;
}

const mapNote = (comment: GithubReviewComment): GitLabNoteDC => ({
  id: comment.id,
  body: comment.body,
  author: comment.user
    ? {
        name: comment.user.name || comment.user.login,
        username: comment.user.login,
        avatar_url: comment.user.avatar_url,
      }
    : undefined,
  created_at: comment.created_at,
  updated_at: comment.updated_at ?? comment.created_at,
});

const linePoint = (line: number | null, type: 'old' | 'new') => ({
  type,
  old_line: type === 'old' ? line : null,
  new_line: type === 'new' ? line : null,
});

function positionFor(comment: GithubReviewComment): GitLabNotePositionDC {
  const position = { old_path: comment.path, new_path: comment.path };
  // Keep outdated discussions on the file instead of anchoring them to the wrong line.
  if (
    comment.position === null ||
    comment.subject_type === 'file' ||
    comment.line == null
  )
    return position;

  const side = comment.side === 'LEFT' ? 'old' : 'new';
  const end = linePoint(comment.line, side);
  if (comment.start_line == null)
    return { ...position, old_line: end.old_line, new_line: end.new_line };

  const startSide = comment.start_side
    ? comment.start_side === 'LEFT'
      ? 'old'
      : 'new'
    : side;
  const start = linePoint(comment.start_line, startSide);
  return {
    ...position,
    old_line: start.old_line,
    new_line: start.new_line,
    line_range: { start, end },
  };
}

export const githubDiffDiscussions = (
  comments: GithubReviewComment[],
): GitLabDiscussionDC[] => {
  const threads = new Map<number, GitLabDiscussionDC>();
  for (const comment of comments) {
    if (comment.in_reply_to_id != null) continue;
    const note = { ...mapNote(comment), position: positionFor(comment) };
    threads.set(comment.id, {
      id: String(comment.id),
      individual_note: false,
      notes: [note],
    });
  }
  for (const comment of comments) {
    if (comment.in_reply_to_id != null)
      threads.get(comment.in_reply_to_id)?.notes.push(mapNote(comment));
  }
  return [...threads.values()];
};

export const createGithubReviewApi = (request: CloudRequest) => ({
  listChanges: async (
    ref: ForgePullRequestRef,
    cursor: string | undefined,
    signal: AbortSignal,
  ) => {
    const page = await githubList<GithubChangedFile>(
      request,
      cursor ?? `${pullRequestPath(ref)}/files?per_page=100`,
      signal,
    );
    return { ...page, items: page.items.map(mapGithubChange) };
  },
  listReviewComments: (
    ref: ForgePullRequestRef,
    cursor: string | undefined,
    signal: AbortSignal,
  ) =>
    githubList<GithubReviewComment>(
      request,
      cursor ?? `${pullRequestPath(ref)}/comments?per_page=100`,
      signal,
    ),
  listReviews: (
    ref: ForgePullRequestRef,
    cursor: string | undefined,
    signal: AbortSignal,
  ) =>
    githubList<GithubReview>(
      request,
      cursor ?? `${pullRequestPath(ref)}/reviews?per_page=100`,
      signal,
    ),
  addReviewComment: async (
    ref: ForgePullRequestRef,
    head: string,
    input: CreateDiffCommentInput,
    signal: AbortSignal,
  ) =>
    (
      await request<GithubReviewComment>(
        `${pullRequestPath(ref)}/comments`,
        signal,
        githubCommentPayload(head, input),
      )
    ).data,
  replyToReviewComment: async (
    ref: ForgePullRequestRef,
    id: string,
    body: string,
    signal: AbortSignal,
  ) =>
    (
      await request<GithubReviewComment>(
        `${pullRequestPath(ref)}/comments/${encodeURIComponent(id)}/replies`,
        signal,
        { body: body.trim() },
      )
    ).data,
  submitReview: async (
    ref: ForgePullRequestRef,
    head: string,
    event: GithubReviewEvent,
    body: string,
    signal: AbortSignal,
  ) =>
    (
      await request<GithubReview>(`${pullRequestPath(ref)}/reviews`, signal, {
        event,
        commit_id: head,
        ...(body.trim() && { body: body.trim() }),
      })
    ).data,
});
