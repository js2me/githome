import { getChangesTreeFileDataId } from "@/shared/lib/diff-search";

export const findChangesTreeFileItem = (
  container: HTMLElement,
  fileKey: string,
) => {
  const encodedId = getChangesTreeFileDataId(fileKey);

  for (const element of container.querySelectorAll("[data-changes-file-id]")) {
    const value = element.getAttribute("data-changes-file-id");
    if (value === encodedId || value === fileKey) {
      return element;
    }
  }

  return null;
};

export const scrollElementIntoContainer = (
  container: HTMLElement,
  element: Element,
) => {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  if (elementRect.height === 0 && elementRect.width === 0) {
    return;
  }

  if (elementRect.top < containerRect.top) {
    container.scrollTop -= containerRect.top - elementRect.top;
    return;
  }

  if (elementRect.bottom > containerRect.bottom) {
    container.scrollTop += elementRect.bottom - containerRect.bottom;
  }
};

export const scrollChangesTreeToFile = (
  nav: HTMLElement,
  fileKey: string,
) => {
  const item = findChangesTreeFileItem(nav, fileKey);
  if (item) {
    scrollElementIntoContainer(nav, item);
  }
};
