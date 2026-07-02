import { Comment, FileCode, Folder, FolderOpen, Magnifier } from "@gravity-ui/icons";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type {
  GitLabDiscussionDC,
  GitLabMergeRequestChangeDC,
} from "@/shared/api/gitlab";
import { buildChangeFileKeysWithDiscussions } from "@/shared/lib/gitlab/diff-discussions";
import {
  buildChangesTree,
  type ChangeFileStatus,
  type ChangesTreeNode,
} from "@/shared/lib/build-changes-tree";
import { cn } from "@/shared/lib/cn";
import { getChangesTreeFileDataId } from "@/shared/lib/diff-search";
import { scrollChangesTreeToFile } from "@/shared/lib/scroll-into-container";
import { scrollToDiffFile } from "@/shared/lib/scroll-to-diff-file";
import "./changes-file-tree.css";

const matchesSearchPattern = (path: string, query: string) => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }

  const normalizedPath = path.toLowerCase();

  if (trimmed.includes("*")) {
    const pattern = trimmed
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    return new RegExp(`(^|/)${pattern}$`).test(normalizedPath);
  }

  return normalizedPath.includes(trimmed);
};

const filterTreeNodes = (
  nodes: ChangesTreeNode[],
  query: string,
): ChangesTreeNode[] => {
  const trimmed = query.trim();
  if (!trimmed) {
    return nodes;
  }

  const filtered: ChangesTreeNode[] = [];

  for (const node of nodes) {
    if (node.type === "file") {
      if (matchesSearchPattern(node.path, trimmed)) {
        filtered.push(node);
      }
      continue;
    }

    const children = filterTreeNodes(node.children, trimmed);
    if (
      children.length > 0 ||
      matchesSearchPattern(node.path, trimmed)
    ) {
      filtered.push({
        ...node,
        children,
      });
    }
  }

  return filtered;
};

const findFolderPathsToFile = (
  nodes: ChangesTreeNode[],
  fileId: string,
  ancestors: string[] = [],
): string[] | null => {
  for (const node of nodes) {
    if (node.type === "file") {
      if (node.id === fileId) {
        return ancestors;
      }
      continue;
    }

    const found = findFolderPathsToFile(node.children, fileId, [
      ...ancestors,
      node.path,
    ]);

    if (found) {
      return found;
    }
  }

  return null;
};

const collectFolderPaths = (nodes: ChangesTreeNode[]): string[] => {
  const paths: string[] = [];

  for (const node of nodes) {
    if (node.type === "folder") {
      paths.push(node.path, ...collectFolderPaths(node.children));
    }
  }

  return paths;
};

const FileTypeIcon = ({ fileName }: { fileName: string }) => {
  if (fileName.endsWith(".tsx") || fileName.endsWith(".jsx")) {
    return (
      <span className="changes-file-tree__row-icon changes-file-tree__row-icon--tsx">
        <FileCode />
      </span>
    );
  }

  if (fileName.endsWith(".ts") || fileName.endsWith(".js")) {
    return (
      <span className="changes-file-tree__row-icon changes-file-tree__row-icon--ts">
        <FileCode />
      </span>
    );
  }

  return (
    <span className="changes-file-tree__row-icon">
      <FileCode />
    </span>
  );
};

const FileStatusIcon = ({ status }: { status: ChangeFileStatus }) => {
  if (status === "added") {
    return (
      <span
        className="changes-file-tree__status-icon changes-file-tree__status-icon--added"
        title="Added"
        aria-hidden="true"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm3 7H8.75v2.25H7.25V8.5H5V7h2.25V4.75h1.5V7H11v1.5Z" />
        </svg>
      </span>
    );
  }

  if (status === "deleted") {
    return (
      <span
        className="changes-file-tree__status-icon changes-file-tree__status-icon--deleted"
        title="Deleted"
        aria-hidden="true"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM5 7.25h6v1.5H5v-1.5Z" />
        </svg>
      </span>
    );
  }

  if (status === "renamed") {
    return (
      <span
        className="changes-file-tree__status-icon changes-file-tree__status-icon--renamed"
        title="Renamed"
        aria-hidden="true"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M3.5 4.5h7.79l1.71 1.71v7.29a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Zm6.29 0V3.5a1 1 0 0 0-1-1H3.5a1 1 0 0 0-1 1v8h8.5V4.5h-1.21Z" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className="changes-file-tree__status-icon changes-file-tree__status-icon--modified"
      title="Modified"
      aria-hidden="true"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
        <rect x="2" y="2" width="12" height="12" rx="2" />
        <circle cx="8" cy="8" r="2" fill="var(--color-white)" />
      </svg>
    </span>
  );
};

const TreeNodeView = memo(
  ({
    node,
    depth,
    activeFileKey,
    expandedPaths,
    fileKeysWithDiscussions,
    onToggleFolder,
    onSelectFile,
    onActiveFileChange,
  }: {
    node: ChangesTreeNode;
    depth: number;
    activeFileKey: string | null;
    expandedPaths: Set<string>;
    fileKeysWithDiscussions: ReadonlySet<string>;
    onToggleFolder: (path: string) => void;
    onSelectFile: (change: GitLabMergeRequestChangeDC) => void;
    onActiveFileChange?: (fileKey: string) => void;
  }) => {
    if (node.type === "folder") {
      const expanded = expandedPaths.has(node.path);

      return (
        <div>
          <button
            className={cn(
              "changes-file-tree__row",
              depth > 0 && "changes-file-tree__row--branch",
            )}
            type="button"
            style={
              {
                paddingLeft: `${depth * 16 + 8}px`,
                ...(depth > 0 ? { "--tree-depth": depth } : {}),
              } as CSSProperties
            }
            onClick={() => onToggleFolder(node.path)}
          >
            <span className="changes-file-tree__row-icon">
              {expanded ? <FolderOpen /> : <Folder />}
            </span>
            <span className="changes-file-tree__row-label">{node.name}</span>
          </button>

          {expanded && (
            <div
              className="changes-file-tree__children"
              style={{ "--tree-level": depth + 1 } as CSSProperties}
            >
              {node.children.map((child) => (
                <TreeNodeView
                  key={child.type === "folder" ? `folder:${child.path}` : child.id}
                  node={child}
                  depth={depth + 1}
                  activeFileKey={activeFileKey}
                  expandedPaths={expandedPaths}
                  fileKeysWithDiscussions={fileKeysWithDiscussions}
                  onToggleFolder={onToggleFolder}
                  onSelectFile={onSelectFile}
                  onActiveFileChange={onActiveFileChange}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    const isActive = activeFileKey === node.id;
    const hasDiscussions = fileKeysWithDiscussions.has(node.id);

    return (
      <button
        className={cn(
          "changes-file-tree__row",
          depth > 0 && "changes-file-tree__row--branch",
          isActive && "changes-file-tree__row--active",
        )}
        type="button"
        data-changes-file-id={getChangesTreeFileDataId(node.id)}
        style={
          {
            paddingLeft: `${depth * 16 + 8}px`,
            ...(depth > 0 ? { "--tree-depth": depth } : {}),
          } as CSSProperties
        }
        title={node.path}
        onClick={() => {
          onActiveFileChange?.(node.id);
          onSelectFile(node.change);
        }}
      >
        <FileTypeIcon fileName={node.name} />
        <span className="changes-file-tree__row-label">{node.name}</span>
        <span className="changes-file-tree__row-stats">
          {node.additions > 0 && (
            <span className="changes-file-tree__stat-added">+{node.additions}</span>
          )}
          {node.deletions > 0 && (
            <span className="changes-file-tree__stat-removed">−{node.deletions}</span>
          )}
        </span>
        {hasDiscussions && (
          <span
            className="changes-file-tree__comment-icon"
            title="Есть комментарии"
            aria-hidden="true"
          >
            <Comment />
          </span>
        )}
        <FileStatusIcon status={node.status} />
      </button>
    );
  },
);

export const ChangesFileTree = memo(
  ({
    changes,
    discussions,
    activeFileKey,
    onActiveFileChange,
  }: {
    changes: GitLabMergeRequestChangeDC[];
    discussions: GitLabDiscussionDC[];
    activeFileKey: string | null;
    onActiveFileChange?: (fileKey: string) => void;
  }) => {
    const tree = useMemo(() => buildChangesTree(changes), [changes]);
    const fileKeysWithDiscussions = useMemo(
      () => buildChangeFileKeysWithDiscussions(discussions, changes),
      [changes, discussions],
    );
    const navRef = useRef<HTMLElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const filteredTree = useMemo(
      () => filterTreeNodes(tree, searchQuery),
      [searchQuery, tree],
    );
    const folderPaths = useMemo(() => collectFolderPaths(tree), [tree]);
    const [expandedPaths, setExpandedPaths] = useState(
      () => new Set(folderPaths),
    );

    useEffect(() => {
      setExpandedPaths(new Set(folderPaths));
    }, [folderPaths]);

    useLayoutEffect(() => {
      if (!activeFileKey) {
        return;
      }

      const folderPathsToFile = findFolderPathsToFile(tree, activeFileKey) ?? [];
      const needsExpand = folderPathsToFile.some(
        (path) => !expandedPaths.has(path),
      );

      if (needsExpand) {
        setExpandedPaths((current) => {
          const next = new Set(current);
          for (const path of folderPathsToFile) {
            next.add(path);
          }
          return next;
        });
        return;
      }

      const nav = navRef.current;
      if (!nav) {
        return;
      }

      scrollChangesTreeToFile(nav, activeFileKey);
    }, [activeFileKey, expandedPaths, filteredTree, tree]);

    const handleToggleFolder = (path: string) => {
      setExpandedPaths((current) => {
        const next = new Set(current);

        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }

        return next;
      });
    };

    if (changes.length === 0) {
      return null;
    }

    return (
      <aside className="changes-file-tree flex max-h-[calc(100vh-2rem)] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--file-tree-border)] bg-[var(--file-tree-bg)]">
        <div className="changes-file-tree__header">
          <span>Files</span>
          <span className="changes-file-tree__count">{changes.length}</span>
        </div>

        <label className="changes-file-tree__search">
          <Magnifier width={16} height={16} />
          <input
            className="changes-file-tree__search-input"
            placeholder="Search (e.g. *.vue)"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>

        <nav ref={navRef} className="changes-file-tree__nav">
          {filteredTree.map((node) => (
            <TreeNodeView
              key={node.type === "folder" ? `folder:${node.path}` : node.id}
              node={node}
              depth={0}
              activeFileKey={activeFileKey}
              expandedPaths={expandedPaths}
              fileKeysWithDiscussions={fileKeysWithDiscussions}
              onToggleFolder={handleToggleFolder}
              onSelectFile={scrollToDiffFile}
              onActiveFileChange={onActiveFileChange}
            />
          ))}
        </nav>
      </aside>
    );
  },
);
