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
  const element = document.getElementById(getDiffFileElementId(fileKey));
  if (!element) {
    return;
  }

  const top = element.getBoundingClientRect().top + window.scrollY - 16;
  window.scrollTo({ top, behavior: "smooth" });
};
