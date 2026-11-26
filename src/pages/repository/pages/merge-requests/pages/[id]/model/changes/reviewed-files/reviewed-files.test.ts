import { describe, expect, it, vi } from 'vitest';
import type {
  GitLabDiscussionDC,
  GitLabMergeRequestChangeDC,
} from '@/shared/api/gitlab';
import {
  getFileReviewFingerprint,
  getReviewedFilePath,
} from './file-review-fingerprint';
import {
  findReviewedFilesNote,
  formatReviewedFiles,
  readReviewedFiles,
} from './reviewed-files-note';

const file = {
  path: 'src/<file--> " with\nlinebreak.ts',
  commit: 'abc123',
  fingerprint: 'a'.repeat(64),
};
const body = formatReviewedFiles([file]);
const discussion = (
  id: number,
  authorId: number,
  noteBody = body,
  individual_note = true,
): GitLabDiscussionDC => ({
  id: String(id),
  individual_note,
  notes: [
    {
      id,
      body: noteBody,
      author: { id: authorId },
      created_at: '',
      updated_at: '',
    },
  ],
});

describe('review note', () => {
  it('round-trips file paths safely inside one HTML comment', () => {
    expect(body).toMatch(/^👀\n\n<!-- /);
    expect(body.match(/-->/g)).toHaveLength(1);
    expect(readReviewedFiles(body)).toEqual([file]);
    expect(readReviewedFiles(formatReviewedFiles([]))).toEqual([]);
  });

  it('finds only the latest valid plain note of the current reviewer', () => {
    const notes = [
      discussion(6, 2),
      discussion(7, 1, '👀'),
      discussion(8, 1, body, false),
      discussion(9, 1, body.replace(file.fingerprint, 'invalid')),
      discussion(5, 1),
      discussion(4, 1),
    ];
    expect(findReviewedFilesNote(notes, 1)?.id).toBe(5);
    expect(findReviewedFilesNote(notes, 2)?.id).toBe(6);
    expect(findReviewedFilesNote(notes, null)).toBeUndefined();
    expect(readReviewedFiles(body.replace('[{', '[null,{'))).toBeNull();
  });
});

const change: GitLabMergeRequestChangeDC = {
  old_path: 'before.ts',
  new_path: 'after.ts',
  diff: '@@ -1 +1 @@\n-before\n+after',
  renamed_file: true,
  deleted_file: false,
  new_file: false,
};

describe('file review fingerprint', () => {
  it('compares the file patch and ignores unrelated change metadata', async () => {
    const loadBlobId = vi.fn();
    const fingerprint = await getFileReviewFingerprint(change, loadBlobId);
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(
      await getFileReviewFingerprint(
        { ...change, file_hash: 'other', generated_file: true },
        loadBlobId,
      ),
    ).toBe(fingerprint);
    expect(
      await getFileReviewFingerprint(
        { ...change, diff: `${change.diff}!` },
        loadBlobId,
      ),
    ).not.toBe(fingerprint);
    expect(
      await getFileReviewFingerprint(
        { ...change, b_mode: '100755' },
        loadBlobId,
      ),
    ).not.toBe(fingerprint);
    expect(loadBlobId).not.toHaveBeenCalled();
  });

  it('compares blob ids when GitLab truncates or omits the patch', async () => {
    const loadBlobId = vi.fn(async (side: 'old' | 'new') =>
      side === 'old' ? 'before' : 'after',
    );
    const binary = { ...change, diff: 'Binary files differ' };
    const fingerprint = await getFileReviewFingerprint(binary, loadBlobId);
    expect(loadBlobId.mock.calls).toEqual([
      ['old', 'before.ts'],
      ['new', 'after.ts'],
    ]);
    expect(
      await getFileReviewFingerprint(
        { ...change, too_large: true },
        loadBlobId,
      ),
    ).toBe(fingerprint);
    expect(
      await getFileReviewFingerprint(binary, async () => 'different'),
    ).not.toBe(fingerprint);
  });

  it('only reads the existing side for deleted and created files', async () => {
    const loadBlobId = vi.fn(async () => 'blob');
    const deleted = { ...change, diff: '', deleted_file: true };
    expect(getReviewedFilePath(deleted)).toBe('before.ts');
    await getFileReviewFingerprint(deleted, loadBlobId);
    expect(loadBlobId.mock.calls).toEqual([['old', 'before.ts']]);
    loadBlobId.mockClear();
    await getFileReviewFingerprint(
      { ...change, diff: '', new_file: true },
      loadBlobId,
    );
    expect(loadBlobId.mock.calls).toEqual([['new', 'after.ts']]);
  });
});
