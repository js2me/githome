import type { GitLabMergeRequestChange } from "@/shared/api/gitlab";
import { getDiffFileKey } from "@/shared/lib/diff-search";

export type ChangeFileStatus = "added" | "deleted" | "renamed" | "modified";

export interface ChangesTreeFile {
  type: "file";
  id: string;
  name: string;
  path: string;
  status: ChangeFileStatus;
  change: GitLabMergeRequestChange;
}

export interface ChangesTreeFolder {
  type: "folder";
  name: string;
  path: string;
  children: ChangesTreeNode[];
}

export type ChangesTreeNode = ChangesTreeFile | ChangesTreeFolder;

export const getChangeDisplayPath = (change: GitLabMergeRequestChange) => {
  if (change.deletedFile) {
    return change.oldPath;
  }

  return change.newPath;
};

export const getChangeFileStatus = (
  change: GitLabMergeRequestChange,
): ChangeFileStatus => {
  if (change.newFile) {
    return "added";
  }

  if (change.deletedFile) {
    return "deleted";
  }

  if (change.renamedFile) {
    return "renamed";
  }

  return "modified";
};

const sortTreeNodes = (nodes: ChangesTreeNode[]) => {
  nodes.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "folder" ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

  for (const node of nodes) {
    if (node.type === "folder") {
      sortTreeNodes(node.children);
    }
  }
};

export const buildChangesTree = (
  changes: GitLabMergeRequestChange[],
): ChangesTreeNode[] => {
  const root: ChangesTreeFolder = {
    type: "folder",
    name: "",
    path: "",
    children: [],
  };

  for (const change of changes) {
    const filePath = getChangeDisplayPath(change);
    const segments = filePath.split("/");
    const fileName = segments.pop();

    if (!fileName) {
      continue;
    }

    let current = root;
    const folderSegments: string[] = [];

    for (const segment of segments) {
      folderSegments.push(segment);
      const folderPath = folderSegments.join("/");

      let folder = current.children.find(
        (node): node is ChangesTreeFolder =>
          node.type === "folder" && node.name === segment,
      );

      if (!folder) {
        folder = {
          type: "folder",
          name: segment,
          path: folderPath,
          children: [],
        };
        current.children.push(folder);
      }

      current = folder;
    }

    current.children.push({
      type: "file",
      id: getDiffFileKey(change.oldPath, change.newPath),
      name: fileName,
      path: filePath,
      status: getChangeFileStatus(change),
      change,
    });
  }

  sortTreeNodes(root.children);
  return root.children;
};
