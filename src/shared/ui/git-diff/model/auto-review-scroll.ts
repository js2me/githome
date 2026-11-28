import {
  createAutoReviewDebounce,
  reviewableDiff,
} from './auto-review-debounce';

const SCROLL_INTENT_MS = 250;
const EDGE_TOLERANCE_PX = 2;

export function trackAutoReviewScroll(
  list: HTMLElement,
  markReviewed: (article: HTMLElement) => boolean,
) {
  const controller = new AbortController();
  const { signal } = controller;
  const options = { passive: true, signal };
  const seen = new Map<HTMLElement, number>();
  let intentUntil = 0;
  let scrollY = window.scrollY;
  let downward = false;
  let frame = 0;
  let adjustmentFrame = 0;
  const debounce = createAutoReviewDebounce(list, (file) => {
    if (adjustmentFrame || !markReviewed(file)) return false;
    seen.delete(file);
    intentUntil = 0;
    // The collapse restores the next file's screen position on the next frame.
    adjustmentFrame = requestAnimationFrame(() => {
      scrollY = window.scrollY;
      adjustmentFrame = 0;
    });
    return true;
  });

  const resetExposure = () => {
    intentUntil = 0;
    cancelAnimationFrame(frame);
    frame = 0;
    seen.clear();
  };

  const observeFile = (
    file: HTMLElement,
    rect: DOMRect,
    top: number,
    bottom: number,
    completeOnScroll: boolean,
  ) => {
    const previous = seen.get(file) ?? 0;
    if (!rect.height || rect.bottom <= top) {
      if (
        completeOnScroll &&
        rect.height &&
        previous >= rect.height - EDGE_TOLERANCE_PX
      ) {
        debounce.queue(file, false);
      }
      seen.delete(file);
      return;
    }

    const start = Math.max(0, top - rect.top);
    // Require continuous coverage from the start. A jump to the end isn't a review.
    if (start > previous + EDGE_TOLERANCE_PX) return;
    const end = Math.min(rect.height, bottom - rect.top);
    seen.set(file, Math.max(previous, end));
    if (completeOnScroll && end >= rect.height - EDGE_TOLERANCE_PX) {
      debounce.queue(file, true);
    }
  };

  const sample = (completeOnScroll = false, goingBack = false) => {
    if (document.hidden || document.querySelector('dialog[open]')) {
      resetExposure();
      return;
    }

    const bottom = window.innerHeight;
    const firstFile = list.querySelector<HTMLElement>(':scope > article');
    if (!firstFile) return;
    const top = parseFloat(getComputedStyle(firstFile).scrollMarginTop) || 0;
    debounce.visit(top, bottom, goingBack);

    const files = list.querySelectorAll<HTMLElement>(
      `:scope > ${reviewableDiff}`,
    );
    for (const file of files) {
      const rect = file.getBoundingClientRect();
      if (rect.top >= bottom) break;
      observeFile(file, rect, top, bottom, completeOnScroll);
    }

    for (const file of seen.keys()) {
      if (
        !file.matches(reviewableDiff) ||
        !list.contains(file) ||
        file.getBoundingClientRect().top >= bottom
      ) {
        seen.delete(file);
      }
    }
  };

  const noteScrollIntent = (event: Event) => {
    if (!event.isTrusted || adjustmentFrame) return;
    const now = performance.now();
    if (now > intentUntil) sample();
    intentUntil = now + SCROLL_INTENT_MS;
  };

  window.addEventListener(
    'wheel',
    (event) => {
      if (event.deltaY && !event.ctrlKey) noteScrollIntent(event);
    },
    options,
  );
  window.addEventListener('touchmove', noteScrollIntent, options);
  window.addEventListener(
    'keydown',
    (event) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, button, [contenteditable]',
        )
      )
        return;
      if (
        ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(event.key)
      ) {
        noteScrollIntent(event);
      }
    },
    options,
  );
  window.addEventListener('pointerdown', resetExposure, {
    capture: true,
    signal,
  });
  window.addEventListener('resize', resetExposure, options);
  document.addEventListener('visibilitychange', resetExposure, { signal });

  window.addEventListener(
    'scroll',
    () => {
      if (adjustmentFrame) return;
      const nextY = window.scrollY;
      if (nextY === scrollY) return;
      downward = nextY > scrollY;
      scrollY = nextY;
      if (performance.now() > intentUntil) {
        resetExposure();
        // A jump can restart a queued review, but cannot complete a new one.
        sample(false, !downward);
        return;
      }

      frame ||= requestAnimationFrame(() => {
        frame = 0;
        sample(downward, !downward);
      });
    },
    options,
  );

  frame = requestAnimationFrame(() => {
    frame = 0;
    sample();
  });

  return () => {
    resetExposure();
    cancelAnimationFrame(adjustmentFrame);
    debounce.dispose();
    controller.abort();
  };
}
