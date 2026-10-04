import type { GitLabRepositoryTreeItemDC } from "@/shared/api/gitlab";

export const sortRepositoryTreeItems = (
  items: GitLabRepositoryTreeItemDC[],
): GitLabRepositoryTreeItemDC[] =>
  [...items].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "tree" ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

export const isMarkdownPath = (path: string) =>
  /\.(md|markdown)$/i.test(path);

export const isImagePath = (path: string) =>
  /\.(apng|avif|bmp|gif|ico|jfif|jpe?g|png|svg|tiff?|webp)$/i.test(path);
