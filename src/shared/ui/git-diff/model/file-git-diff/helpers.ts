import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";

export const getChangePath = (change: GitLabMergeRequestChangeDC) => {
  if (change.renamed_file && change.old_path !== change.new_path) {
    return `${change.old_path} → ${change.new_path}`;
  }

  return change.new_path;
};

export const getChangeBadge = (change: GitLabMergeRequestChangeDC) => {
  if (change.new_file) {
    return "new" as const;
  }

  if (change.deleted_file) {
    return "deleted" as const;
  }

  if (change.renamed_file) {
    return "renamed" as const;
  }

  return null;
};

export const getExpandFilePath = (change: GitLabMergeRequestChangeDC) => {
  if (change.deleted_file) {
    return change.old_path;
  }

  return change.new_path;
};
