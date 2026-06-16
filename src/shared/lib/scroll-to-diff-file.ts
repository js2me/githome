import type { GitLabMergeRequestChange } from "@/shared/api/gitlab";
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

export const scrollToDiffFile = (change: GitLabMergeRequestChange) => {
  const fileKey = getDiffFileKey(change.oldPath, change.newPath);
  document.getElementById(getDiffFileElementId(fileKey))?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};
