import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";

export const isHiddenMergeRequestChange = (
  change: GitLabMergeRequestChangeDC,
): boolean => {
  if (change.diff?.trim() || change.too_large) {
    return false;
  }

  return Boolean(change.collapsed || change.generated_file);
};

export const isAutoCollapsedMergeRequestChange = (
  change: GitLabMergeRequestChangeDC,
): boolean => !change.diff?.trim() && !change.too_large;

export const getVisibleMergeRequestChanges = (
  changes: GitLabMergeRequestChangeDC[],
): GitLabMergeRequestChangeDC[] =>
  changes.filter((change) => !isHiddenMergeRequestChange(change));
