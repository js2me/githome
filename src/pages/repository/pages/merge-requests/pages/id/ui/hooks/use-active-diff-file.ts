import { useEffect, useState } from "react";
import type { GitLabMergeRequestChange } from "@/shared/api/gitlab";
import { getDiffFileElementId, getDiffFileKey } from "@/shared/lib/diff-search";
import { getDiffFileKeyFromElementId } from "@/shared/lib/scroll-to-diff-file";

export const useActiveDiffFile = (changes: GitLabMergeRequestChange[]) => {
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null);

  useEffect(() => {
    if (changes.length === 0) {
      setActiveFileKey(null);
      return;
    }

    let observer: IntersectionObserver | null = null;
    let cancelled = false;

    const setupObserver = () => {
      if (cancelled) {
        return;
      }

      const elements = changes
        .map((change) => {
          const fileKey = getDiffFileKey(change.oldPath, change.newPath);
          return document.getElementById(getDiffFileElementId(fileKey));
        })
        .filter((element): element is HTMLElement => element !== null);

      if (elements.length === 0) {
        requestAnimationFrame(setupObserver);
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries
            .filter((entry) => entry.isIntersecting)
            .sort(
              (left, right) =>
                left.boundingClientRect.top - right.boundingClientRect.top,
            );

          const topEntry = visibleEntries[0];
          if (!topEntry) {
            return;
          }

          const fileKey = getDiffFileKeyFromElementId(topEntry.target.id);
          if (fileKey) {
            setActiveFileKey(fileKey);
          }
        },
        {
          root: null,
          rootMargin: "-15% 0px -70% 0px",
          threshold: [0, 0.1, 0.25],
        },
      );

      for (const element of elements) {
        observer.observe(element);
      }
    };

    setupObserver();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [changes]);

  return activeFileKey;
};
