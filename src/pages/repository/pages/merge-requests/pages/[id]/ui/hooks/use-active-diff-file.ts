import { useEffect, useState } from "react";
import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import { getDiffFileElementId, getDiffFileKey } from "@/shared/lib/diff-search";
import { getDiffFileKeyFromElementId } from "@/shared/lib/scroll-to-diff-file";

const ACTIVE_FILE_MARKER_PX = 128;
const SCROLLED_TO_BOTTOM_THRESHOLD_PX = 48;

const collectDiffFileElements = (changes: GitLabMergeRequestChangeDC[]) =>
  changes
    .map((change) => {
      const fileKey = getDiffFileKey(change.old_path, change.new_path);
      return document.getElementById(getDiffFileElementId(fileKey));
    })
    .filter((element): element is HTMLElement => element !== null);

const isScrolledToBottom = () => {
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    0,
  );

  return maxScroll - scrollY <= SCROLLED_TO_BOTTOM_THRESHOLD_PX;
};

export const getActiveDiffFileKeyFromViewport = (
  elements: HTMLElement[],
): string | null => {
  if (elements.length === 0) {
    return null;
  }

  const marker = ACTIVE_FILE_MARKER_PX;
  const viewportHeight = window.innerHeight;
  const lastElement = elements[elements.length - 1];

  if (isScrolledToBottom()) {
    const lastRect = lastElement.getBoundingClientRect();
    if (lastRect.top < viewportHeight) {
      return getDiffFileKeyFromElementId(lastElement.id);
    }
  }

  const visibleBelowMarker = elements.filter((element) => {
    const { top, bottom } = element.getBoundingClientRect();
    return bottom > marker && top < viewportHeight;
  });

  if (visibleBelowMarker.length > 0) {
    const bottomMost = visibleBelowMarker.reduce((current, candidate) =>
      candidate.getBoundingClientRect().top > current.getBoundingClientRect().top
        ? candidate
        : current,
    );

    const bottomMostTop = bottomMost.getBoundingClientRect().top;
    if (bottomMostTop > marker) {
      return getDiffFileKeyFromElementId(bottomMost.id);
    }
  }

  for (const element of elements) {
    const { top, bottom } = element.getBoundingClientRect();

    if (top <= marker && bottom > marker) {
      return getDiffFileKeyFromElementId(element.id);
    }
  }

  let activeElement = elements[0];

  for (const element of elements) {
    if (element.getBoundingClientRect().top <= marker) {
      activeElement = element;
    }
  }

  if (activeElement.getBoundingClientRect().top <= marker) {
    return getDiffFileKeyFromElementId(activeElement.id);
  }

  for (const element of elements) {
    if (element.getBoundingClientRect().top > marker) {
      return getDiffFileKeyFromElementId(element.id);
    }
  }

  return getDiffFileKeyFromElementId(lastElement.id);
};

export const useActiveDiffFile = (changes: GitLabMergeRequestChangeDC[]) => {
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null);

  useEffect(() => {
    if (changes.length === 0) {
      setActiveFileKey(null);
      return;
    }

    let rafId: number | null = null;
    let cancelled = false;

    const syncActiveFile = () => {
      if (cancelled) {
        return;
      }

      const fileElements = collectDiffFileElements(changes);
      if (fileElements.length === 0) {
        return;
      }

      const nextKey = getActiveDiffFileKeyFromViewport(fileElements);
      if (!nextKey) {
        return;
      }

      setActiveFileKey((current) => (current === nextKey ? current : nextKey));
    };

    const scheduleSync = () => {
      if (rafId !== null) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncActiveFile();
      });
    };

    const setup = () => {
      if (cancelled) {
        return;
      }

      if (collectDiffFileElements(changes).length === 0) {
        requestAnimationFrame(setup);
        return;
      }

      syncActiveFile();
      window.addEventListener("scroll", scheduleSync, { passive: true });
      window.addEventListener("resize", scheduleSync, { passive: true });
      document.addEventListener("scroll", scheduleSync, {
        passive: true,
        capture: true,
      });
    };

    setup();

    return () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      document.removeEventListener("scroll", scheduleSync, { capture: true });
    };
  }, [changes]);

  return { activeFileKey, setActiveFileKey };
};
