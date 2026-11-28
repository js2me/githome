import { describe, expect, it } from 'vitest';
import { getDiffLineKeyForChange } from '@/shared/lib/gitlab/discussions/diff-discussions';
import { githubCommentPayload, mapGithubChange } from './diff';
import { type GithubReviewComment, githubDiffDiscussions } from './review';

const renamed = mapGithubChange({
  filename: 'src/new.ts',
  previous_filename: 'src/old.ts',
  status: 'renamed',
  additions: 3,
  deletions: 2,
  patch: '@@ -2,2 +4,3 @@',
});

const baseComment = {
  body: 'Note',
  oldPath: renamed.old_path,
  newPath: renamed.new_path,
};

describe('GitHub review diff mapping', () => {
  it('keeps rename paths, statistics, and missing patches distinct', () => {
    expect(renamed).toMatchObject({
      renamed_file: true,
      old_path: 'src/old.ts',
      new_path: 'src/new.ts',
      added_lines: 3,
      removed_lines: 2,
      collapsed: false,
    });
    expect(
      mapGithubChange({
        filename: 'huge.ts',
        status: 'removed',
        additions: 0,
        deletions: 1200,
      }),
    ).toMatchObject({ deleted_file: true, collapsed: true });
  });

  it('addresses file, left-side, and multiline comments using the PR head', () => {
    expect(
      githubCommentPayload('sha', {
        ...baseComment,
        oldLine: null,
        newLine: null,
      }),
    ).toEqual({
      body: 'Note',
      path: 'src/new.ts',
      commit_id: 'sha',
      subject_type: 'file',
    });
    expect(
      githubCommentPayload('sha', {
        ...baseComment,
        oldLine: 2,
        newLine: null,
      }),
    ).toEqual({
      body: 'Note',
      path: 'src/new.ts',
      commit_id: 'sha',
      side: 'LEFT',
      line: 2,
    });
    expect(
      githubCommentPayload('sha', {
        ...baseComment,
        oldLine: 4,
        newLine: 8,
        lineRange: {
          start: { type: 'new', oldLine: null, newLine: 5 },
          end: { type: 'new', oldLine: 4, newLine: 8 },
        },
      }),
    ).toEqual({
      body: 'Note',
      path: 'src/new.ts',
      commit_id: 'sha',
      side: 'RIGHT',
      line: 8,
      start_side: 'RIGHT',
      start_line: 5,
    });
  });

  it('groups replies and does not attach outdated comments to current line numbers', () => {
    const root: GithubReviewComment = {
      id: 1,
      body: 'Root',
      path: renamed.new_path,
      side: 'LEFT',
      line: 3,
      start_line: 2,
      user: null,
      created_at: '2026-02-20T00:00:00Z',
    };
    const [thread, outdated] = githubDiffDiscussions([
      { ...root, id: 2, body: 'Reply', in_reply_to_id: 1 },
      root,
      { ...root, id: 3, position: null },
    ]);
    expect(thread.notes.map(({ body }) => body)).toEqual(['Root', 'Reply']);
    expect(getDiffLineKeyForChange(thread.notes[0].position!, renamed)).toBe(
      'src/old.ts:old:2',
    );
    expect(
      getDiffLineKeyForChange(outdated.notes[0].position!, renamed),
    ).toBeNull();
  });
});
