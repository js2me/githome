import { getDiffFileElementId } from '@/shared/lib/diff/diff-search';

export const revealDiffFile = (fileKey: string) => {
  const element = document.getElementById(getDiffFileElementId(fileKey));
  if (element?.hasAttribute('data-diff-reviewed')) {
    const stack = element.parentElement?.querySelector<HTMLDetailsElement>(
      ':scope > [data-diff-reviewed-stack]',
    );
    if (stack) stack.open = true;
  }
  return element;
};

export const scrollToDiffFile = (fileKey: string) => {
  const element = revealDiffFile(fileKey);
  if (!element) return false;

  const top = element.getBoundingClientRect().top + window.scrollY - 16;
  window.scrollTo({ top, behavior: 'instant' });
  return true;
};
