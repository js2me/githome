import { getDiffFileElementId } from '@/shared/lib/diff-search';

export const scrollToDiffFile = (fileKey: string) => {
  const element = document.getElementById(getDiffFileElementId(fileKey));
  if (!element) return false;

  const top = element.getBoundingClientRect().top + window.scrollY - 16;
  window.scrollTo({ top, behavior: 'instant' });
  return true;
};
