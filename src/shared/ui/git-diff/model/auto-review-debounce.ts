const REVIEW_DELAY_MS = 20_000;
const REVIEW_RETRY_MS = 250;

export const reviewableDiff = 'article[data-diff-auto-reviewable="true"]';
const commentEditor =
  '[data-diff-comment-editing="true"], textarea, [contenteditable="true"]';

interface PendingReview {
  visible: boolean;
  editing: boolean;
  timeout: number;
}

const hasOpenComment = (file: HTMLElement) =>
  file.matches(commentEditor) || Boolean(file.querySelector(commentEditor));

export function createAutoReviewDebounce(
  list: HTMLElement,
  markReviewed: (file: HTMLElement) => boolean,
) {
  const pending = new Map<HTMLElement, PendingReview>();

  const remove = (file: HTMLElement, review: PendingReview) => {
    clearTimeout(review.timeout);
    pending.delete(file);
  };

  const arm = (
    file: HTMLElement,
    review: PendingReview,
    delay = REVIEW_DELAY_MS,
  ) => {
    clearTimeout(review.timeout);
    if (review.editing) return;
    review.timeout = window.setTimeout(() => {
      if (!list.contains(file) || !file.matches(reviewableDiff)) {
        remove(file, review);
      } else if (hasOpenComment(file)) {
        review.editing = true;
      } else if (document.hidden || document.querySelector('dialog[open]')) {
        arm(file, review);
      } else if (markReviewed(file)) {
        remove(file, review);
      } else {
        arm(file, review, REVIEW_RETRY_MS);
      }
    }, delay);
  };

  const observer = new MutationObserver(() => {
    for (const [file, review] of pending) {
      if (!list.contains(file) || !file.matches(reviewableDiff)) {
        remove(file, review);
        continue;
      }
      const editing = hasOpenComment(file);
      if (review.editing === editing) continue;
      review.editing = editing;
      arm(file, review);
    }
  });
  observer.observe(list, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-diff-auto-reviewable', 'data-diff-comment-editing'],
  });

  return {
    queue(file: HTMLElement, visible: boolean) {
      if (pending.has(file)) return;
      const review = { visible, editing: hasOpenComment(file), timeout: 0 };
      pending.set(file, review);
      arm(file, review);
    },
    visit(top: number, bottom: number, goingBack: boolean) {
      for (const [file, review] of pending) {
        const rect = file.getBoundingClientRect();
        const visible = rect.bottom > top && rect.top < bottom;
        if (visible && (!review.visible || goingBack)) arm(file, review);
        review.visible = visible;
      }
    },
    dispose() {
      observer.disconnect();
      for (const [file, review] of pending) remove(file, review);
    },
  };
}
