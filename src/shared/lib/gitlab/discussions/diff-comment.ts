import type { GitLabDiffLinePoint } from '../diff/line-code';

export interface CreateDiffCommentInput {
  body: string;
  oldPath: string;
  newPath: string;
  oldLine: number | null;
  newLine: number | null;
  lineRange?: {
    start: GitLabDiffLinePoint;
    end: GitLabDiffLinePoint;
  };
}
