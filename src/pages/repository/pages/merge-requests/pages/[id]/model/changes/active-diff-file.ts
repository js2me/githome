import { action, actionBound, observable } from 'mobx';
import type { GitLabMergeRequestChangeDC } from '@/shared/api/gitlab';
import {
  getDiffFileElementId,
  getDiffFileKey,
} from '@/shared/lib/diff/diff-search';
import { scrollToDiffFile } from '@/shared/lib/diff/scroll-to-diff-file';

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
    if (
      files[middle].element.getBoundingClientRect().top <= ACTIVE_FILE_MARKER_PX
    ) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return files[Math.max(0, low - 1)].key;
};

export class ActiveDiffFile {
  readonly activeFile = observable.box<string | null>(null);
  private selectedScrollY: number | null = null;
  private stopTracking?: () => void;

  @actionBound
  selectActiveFile(fileKey: string) {
    this.selectedScrollY = window.scrollY;
    this.activeFile.set(fileKey);
  }

  @actionBound
  jumpToFile(fileKey: string) {
    if (scrollToDiffFile(fileKey)) this.selectActiveFile(fileKey);
  }

  track(changes: GitLabMergeRequestChangeDC[]) {
    this.dispose();
    this.selectedScrollY = null;
    if (!changes.length) {
      this.activeFile.set(null);
      return;
    }

    const keys = changes.map(({ old_path, new_path }) =>
      getDiffFileKey(old_path, new_path),
    );
    let frame: number | null = null;
    let files: DiffFileAnchor[] = [];

    const sync = action(() => {
      frame = null;
      // A jump can be clamped at the bottom. Keep the clicked file selected until the page moves.
      if (window.scrollY === this.selectedScrollY) return;
      this.selectedScrollY = null;

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

      this.activeFile.set(getActiveDiffFileKey(files));
    });

    const scheduleSync = () => {
      frame ??= requestAnimationFrame(sync);
    };

    scheduleSync();
    window.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync);

    this.stopTracking = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
    };
  }

  dispose() {
    this.stopTracking?.();
    this.stopTracking = undefined;
  }
}
