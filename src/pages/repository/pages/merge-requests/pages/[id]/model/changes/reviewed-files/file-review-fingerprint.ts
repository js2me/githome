import type { GitLabMergeRequestChangeDC } from '@/shared/api/gitlab';

export const getReviewedFilePath = (change: GitLabMergeRequestChangeDC) =>
  change.deleted_file ? change.old_path : change.new_path;

export const getFileReviewFingerprint = async (
  change: GitLabMergeRequestChangeDC,
  loadBlobId: (side: 'old' | 'new', path: string) => Promise<string>,
) => {
  const hasTextDiff = !change.too_large && /^@@ /m.test(change.diff);
  const content = hasTextDiff
    ? ['patch', change.diff]
    : [
        'blobs',
        ...(await Promise.all([
          change.new_file ? null : loadBlobId('old', change.old_path),
          change.deleted_file ? null : loadBlobId('new', change.new_path),
        ])),
      ];
  const value = JSON.stringify([
    change.old_path,
    change.new_path,
    change.new_file,
    change.deleted_file,
    change.renamed_file,
    change.a_mode,
    change.b_mode,
    content,
  ]);
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
};
