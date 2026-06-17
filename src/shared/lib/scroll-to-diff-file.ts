import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import {
  getDiffFileElementId,
  getDiffFileKey,
} from "@/shared/lib/diff-search";

export const getDiffFileKeyFromElementId = (elementId: string) => {
  const prefix = "diff-file-";

  if (!elementId.startsWith(prefix)) {
    return null;
  }

  return decodeURIComponent(elementId.slice(prefix.length));
};

export const scrollToDiffFile = (change: GitLabMergeRequestChangeDC) => {
  const fileKey = getDiffFileKey(change.old_path, change.new_path);
  document.getElementById(getDiffFileElementId(fileKey))?.scrollIntoView({
    behavior: "instant",
    block: "start",
  });
};
