import { observable } from "mobx";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import { getDiffFileElementId, getDiffFileKey } from "@/shared/lib/diff-search";
import { scrollToDiffFile } from "@/shared/lib/scroll-to-diff-file";

const ACTIVE_FILE_MARKER_PX = 128;
const SCROLLED_TO_BOTTOM_THRESHOLD_PX = 48;

interface DiffFileAnchor {
  key: string;
  element: HTMLElement;
}

const getActiveDiffFileKey = (files: DiffFileAnchor[]) => {
  const last = files[files.length - 1];
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (
    maxScroll - window.scrollY <= SCROLLED_TO_BOTTOM_THRESHOLD_PX &&
    last.element.getBoundingClientRect().top < window.innerHeight
  ) {
    return last.key;
  }

  // Diff cards are stacked in the same order as the changes.
  let low = 0;
  let high = files.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (files[middle].element.getBoundingClientRect().top <= ACTIVE_FILE_MARKER_PX) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return files[Math.max(0, low - 1)].key;
};

export const useActiveDiffFile = (changes: GitLabMergeRequestChangeDC[]) => {
  const [activeFile] = useState(() => observable.box<string | null>(null));
  const selectedScrollY = useRef<number | null>(null);

  const selectActiveFile = useCallback((fileKey: string) => {
    selectedScrollY.current = window.scrollY;
    activeFile.set(fileKey);
  }, [activeFile]);

  const jumpToFile = useCallback((fileKey: string) => {
    if (scrollToDiffFile(fileKey)) {
      selectActiveFile(fileKey);
    }
  }, [selectActiveFile]);

  useEffect(() => {
    selectedScrollY.current = null;
    if (!changes.length) {
      activeFile.set(null);
      return;
    }

    const keys = changes.map(({ old_path, new_path }) => getDiffFileKey(old_path, new_path));
    let frame: number | null = null;
    let files: DiffFileAnchor[] = [];

    const sync = () => {
      frame = null;
      // A jump can be clamped at the bottom. Keep the clicked file selected until the page moves.
      if (window.scrollY === selectedScrollY.current) return;
      selectedScrollY.current = null;

      if (!files.length) {
        files = keys.flatMap((key) => {
          const element = document.getElementById(getDiffFileElementId(key));
          return element ? [{ key, element }] : [];
        });
        if (!files.length) {
          scheduleSync();
          return;
        }
      }

      activeFile.set(getActiveDiffFileKey(files));
    };

    const scheduleSync = () => {
      frame ??= requestAnimationFrame(sync);
    };

    scheduleSync();
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
    };
  }, [activeFile, changes]);

  return { activeFile, selectActiveFile, jumpToFile };
};
