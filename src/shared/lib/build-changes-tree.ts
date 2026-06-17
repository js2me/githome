import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import { getDiffFileKey } from "@/shared/lib/diff-search";
import { parseUnifiedDiff } from "@/shared/lib/parse-unified-diff";

export type ChangeFileStatus = "added" | "deleted" | "renamed" | "modified";

export interface ChangesTreeFile {
  type: "file";
  id: string;
  name: string;
  path: string;
  status: ChangeFileStatus;
  additions: number;
  deletions: number;
  change: GitLabMergeRequestChangeDC;
}

export interface ChangesTreeFolder {
  type: "folder";
  name: string;
  path: string;
  children: ChangesTreeNode[];
}

export type ChangesTreeNode = ChangesTreeFile | ChangesTreeFolder;

export const getChangeDisplayPath = (change: GitLabMergeRequestChangeDC) => {
  if (change.deleted_file) {
    return change.old_path;
  }

  return change.new_path;
};

export const getChangeFileStatus = (
  change: GitLabMergeRequestChangeDC,
): ChangeFileStatus => {
  if (change.new_file) {
    return "added";
  }

  if (change.deleted_file) {
    return "deleted";
  }

  if (change.renamed_file) {
    return "renamed";
  }

  return "modified";
};

const getChangeDiffStats = (change: GitLabMergeRequestChangeDC) => {
  if (!change.diff?.trim()) {
    return { additions: 0, deletions: 0 };
  }

  const parsed = parseUnifiedDiff(change.diff);
  return {
    additions: parsed.additions,
    deletions: parsed.deletions,
  };
};

const compressSingleChildFolders = (
  nodes: ChangesTreeNode[],
): ChangesTreeNode[] =>
  nodes.map((node) => {
    if (node.type === "file") {
      return node;
    }

    const children = compressSingleChildFolders(node.children);

    if (
      children.length === 1 &&
      children[0].type === "folder" &&
      !node.name.includes("/") &&
      !children[0].name.includes("/")
    ) {
      const child = children[0];

      return {
        type: "folder",
        name: `${node.name}/${child.name}`,
        path: child.path,
        children: compressSingleChildFolders(child.children),
      };
    }

    return {
      ...node,
      children,
    };
  });

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
  changes: GitLabMergeRequestChangeDC[],
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

    const stats = getChangeDiffStats(change);

    current.children.push({
      type: "file",
      id: getDiffFileKey(change.old_path, change.new_path),
      name: fileName,
      path: filePath,
      status: getChangeFileStatus(change),
      additions: stats.additions,
      deletions: stats.deletions,
      change,
    });
  }

  sortTreeNodes(root.children);
  return compressSingleChildFolders(root.children);
};
