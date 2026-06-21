import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import { buildUnifiedDiffFromGitlabLines } from "@/shared/lib/gitlab/build-unified-diff-from-gitlab-lines";

export interface GitLabWebDiffViewerDC {
  name?: string | null;
  collapsed?: boolean | null;
  generated?: boolean | null;
  error?: string | null;
}

export interface GitLabWebDiffFileDC {
  old_path: string;
  new_path: string;
  new_file?: boolean;
  deleted_file?: boolean;
  renamed_file?: boolean;
  added_lines?: number;
  removed_lines?: number;
  file_hash?: string;
  file_identifier_hash?: string;
  viewer?: GitLabWebDiffViewerDC | null;
  highlighted_diff_lines?: Array<{
    type?: string | null;
    old_line?: number | null;
    new_line?: number | null;
    text?: string | null;
    rich_text?: string | null;
  }>;
}

export const mapGitlabWebDiffFileToChange = (
  file: GitLabWebDiffFileDC,
): GitLabMergeRequestChangeDC => {
  const collapsed = Boolean(file.viewer?.collapsed);
  const generatedFile = Boolean(file.viewer?.generated);
  const tooLarge = file.viewer?.name === "no_preview";
  const highlightedLines = file.highlighted_diff_lines ?? [];
  const diff =
    !collapsed && !tooLarge && highlightedLines.length > 0
      ? buildUnifiedDiffFromGitlabLines(highlightedLines)
      : "";

  return {
    old_path: file.old_path,
    new_path: file.new_path,
    diff,
    new_file: Boolean(file.new_file),
    deleted_file: Boolean(file.deleted_file),
    renamed_file: Boolean(file.renamed_file),
    too_large: tooLarge,
    collapsed: collapsed || undefined,
    generated_file: generatedFile || undefined,
    added_lines: file.added_lines,
    removed_lines: file.removed_lines,
    file_hash: file.file_hash,
  };
};
