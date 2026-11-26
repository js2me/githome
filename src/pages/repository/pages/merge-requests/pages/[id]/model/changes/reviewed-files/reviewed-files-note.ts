import type { GitLabDiscussionDC, GitLabNoteDC } from '@/shared/api/gitlab';

export const REVIEWED_FILES_EMOJI = '👀';
const MARKER = 'githome-reviewed-files:v1';
const PREFIX = `${REVIEWED_FILES_EMOJI}\n\n<!-- ${MARKER}\n`;
const SUFFIX = '\n-->';

export interface ReviewedFile {
  path: string;
  commit: string;
  fingerprint: string;
}

export const readReviewedFiles = (body: string): ReviewedFile[] | null => {
  const value = body.trim();
  if (!value.startsWith(PREFIX) || !value.endsWith(SUFFIX)) {
    return null;
  }

  try {
    const files: unknown = JSON.parse(
      value.slice(PREFIX.length, -SUFFIX.length),
    );
    if (
      !Array.isArray(files) ||
      !files.every(
        (file) =>
          file &&
          typeof file.path === 'string' &&
          file.path.length > 0 &&
          typeof file.commit === 'string' &&
          file.commit.length > 0 &&
          typeof file.fingerprint === 'string' &&
          /^[0-9a-f]{64}$/.test(file.fingerprint),
      )
    ) {
      return null;
    }

    return files;
  } catch {
    return null;
  }
};

export const formatReviewedFiles = (files: Iterable<ReviewedFile>) => {
  const json = JSON.stringify([...files])
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e');
  return `${PREFIX}${json}${SUFFIX}`;
};

export const findReviewedFilesNote = (
  discussions: GitLabDiscussionDC[],
  userId: number | null,
) => {
  let latest: GitLabNoteDC | undefined;
  if (userId !== null) {
    for (const discussion of discussions) {
      const note = discussion.notes[0];
      if (
        discussion.individual_note &&
        note?.author?.id === userId &&
        !note.system &&
        (!latest || note.id > latest.id) &&
        readReviewedFiles(note.body)
      ) {
        latest = note;
      }
    }
  }

  return latest;
};
