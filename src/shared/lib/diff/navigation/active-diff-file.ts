import { action, actionBound, observable } from 'mobx';
import type { GitLabMergeRequestChangeDC } from '@/shared/api/gitlab';
import {
  getDiffFileElementId,
  getDiffFileKey,
} from '@/shared/lib/diff/diff-search';
import { scrollToDiffFile } from '@/shared/lib/diff/navigation/scroll-to-diff-file';

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

  // The anchors are in display order, including any open reviewed stack.
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

    const keysById = new Map(
      changes.map(({ old_path, new_path }) => {
        const key = getDiffFileKey(old_path, new_path);
        return [getDiffFileElementId(key), key];
      }),
    );
    let frame: number | null = null;
    let list: HTMLElement | null = null;
    let files: DiffFileAnchor[] | null = null;

    const sync = action(() => {
      frame = null;
      if (!list?.isConnected) {
        observer.disconnect();
        files = null;
        list =
          document.getElementById(keysById.keys().next().value!)
            ?.parentElement ?? null;
        if (!list) {
          scheduleSync();
          return;
        }
        observer.observe(list, { childList: true });
      }

      if (!files) {
        files = [];
        const hideReviewed = list.querySelector(
          ':scope > [data-diff-reviewed-stack]:not([open])',
        );
        for (const element of list.querySelectorAll<HTMLElement>(
          hideReviewed
            ? ':scope > article:not([data-diff-reviewed])'
            : ':scope > article',
        )) {
          const key = keysById.get(element.id);
          if (key) files.push({ key, element });
        }
      }

      // A jump can be clamped at the bottom. Keep the clicked file selected until the page moves.
      if (
        window.scrollY === this.selectedScrollY &&
        files.some(({ key }) => key === this.activeFile.get())
      )
        return;
      this.selectedScrollY = null;
      this.activeFile.set(files.length ? getActiveDiffFileKey(files) : null);
    });

    const scheduleSync = () => {
      frame ??= requestAnimationFrame(sync);
    };
    const invalidateAnchors = () => {
      files = null;
      scheduleSync();
    };
    const observer = new MutationObserver(invalidateAnchors);
    const onToggle = (event: Event) => {
      if (
        event.target instanceof HTMLDetailsElement &&
        event.target.hasAttribute('data-diff-reviewed-stack')
      )
        invalidateAnchors();
    };

    scheduleSync();
    window.addEventListener('toggle', onToggle, true);
    window.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync);

    this.stopTracking = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('toggle', onToggle, true);
      window.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
    };
  }

  dispose() {
    this.stopTracking?.();
    this.stopTracking = undefined;
  }
}
