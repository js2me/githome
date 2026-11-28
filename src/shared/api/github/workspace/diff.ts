import type { GitLabMergeRequestChangeDC } from '@/shared/api/gitlab';
import type { CreateDiffCommentInput } from '@/shared/lib/gitlab/discussions/diff-comment';

export interface GithubChangedFile {
  filename: string;
  previous_filename?: string;
  patch?: string;
  status: string;
  additions: number;
  deletions: number;
  sha?: string;
}

export const mapGithubChange = (
  file: GithubChangedFile,
): GitLabMergeRequestChangeDC => ({
  old_path: file.previous_filename ?? file.filename,
  new_path: file.filename,
  diff: file.patch ?? '',
  new_file: file.status === 'added',
  renamed_file: file.status === 'renamed',
  deleted_file: file.status === 'removed',
  collapsed: !file.patch && file.additions + file.deletions > 0,
  added_lines: file.additions,
  removed_lines: file.deletions,
  file_hash: file.sha,
});

export function githubCommentPayload(
  commit: string,
  input: CreateDiffCommentInput,
) {
  const base = {
    body: input.body.trim(),
    path: input.newPath,
    commit_id: commit,
  };
  if (input.oldLine == null && input.newLine == null) {
    return { ...base, subject_type: 'file' };
  }

  const end = input.lineRange?.end;
  const start = input.lineRange?.start;
  const side = end
    ? end.type === 'old'
      ? 'LEFT'
      : 'RIGHT'
    : input.newLine == null
      ? 'LEFT'
      : 'RIGHT';
  const line =
    side === 'LEFT' ? (end ?? input).oldLine : (end ?? input).newLine;
  const startOnLeft = start?.type === 'old';
  const startLine = startOnLeft ? start?.oldLine : start?.newLine;
  return {
    ...base,
    side,
    line,
    ...(startLine != null && {
      start_line: startLine,
      start_side: startOnLeft ? 'LEFT' : 'RIGHT',
    }),
  };
}
