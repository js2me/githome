import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";

export const isGeneratedMergeRequestChange = (
  change: GitLabMergeRequestChangeDC,
): boolean =>
  Boolean(change.generated_file || change.collapsed);

export const isAutoCollapsedMergeRequestChange = (
  change: GitLabMergeRequestChangeDC,
): boolean =>
  !change.too_large && isGeneratedMergeRequestChange(change);

export const getVisibleMergeRequestChanges = (
  changes: GitLabMergeRequestChangeDC[],
): GitLabMergeRequestChangeDC[] => changes;
