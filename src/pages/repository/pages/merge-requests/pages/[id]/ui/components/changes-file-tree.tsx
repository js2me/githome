import { Comment, FileCode, Folder, FolderOpen, Magnifier } from "@gravity-ui/icons";
import type { IObservableValue } from "mobx";
import { observer } from "mobx-react-lite";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

const FILE_ROW_HEIGHT = 32;

interface ChangesTreeRow {
  key: string;
  node: ChangesTreeNode;
  depth: number;
}

const flattenVisibleRows = (
  nodes: ChangesTreeNode[],
  collapsedPaths: ReadonlySet<string>,
  depth = 0,
  rows: ChangesTreeRow[] = [],
): ChangesTreeRow[] => {
  for (const node of nodes) {
    rows.push({ key: node.type === "folder" ? `folder:${node.path}` : node.id, node, depth });
    if (node.type === "folder" && !collapsedPaths.has(node.path)) {
      flattenVisibleRows(node.children, collapsedPaths, depth + 1, rows);
    }
  }
  return rows;
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
    isActive,
    expanded,
    hasDiscussions,
    onToggleFolder,
    onSelectFile,
  }: {
    node: ChangesTreeNode;
    depth: number;
    isActive: boolean;
    expanded: boolean;
    hasDiscussions: boolean;
    onToggleFolder: (path: string) => void;
    onSelectFile: (fileKey: string) => void;
  }) => {
    const className = cn(
      "changes-file-tree__row",
      depth > 0 && "changes-file-tree__row--branch",
      isActive && "changes-file-tree__row--active",
    );
    const style = { "--tree-depth": depth } as CSSProperties;

    if (node.type === "folder") {
      return (
        <button
          className={className}
          type="button"
          style={style}
          aria-expanded={expanded}
          onClick={() => onToggleFolder(node.path)}
        >
          <span className="changes-file-tree__row-icon">
            {expanded ? <FolderOpen /> : <Folder />}
          </span>
          <span className="changes-file-tree__row-label">{node.name}</span>
        </button>
      );
    }

    return (
      <button
        className={className}
        type="button"
        data-changes-file-id={getChangesTreeFileDataId(node.id)}
        aria-current={isActive || undefined}
        style={style}
        title={node.path}
        onClick={() => onSelectFile(node.id)}
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

export const ChangesFileTree = observer(
  ({
    changes,
    discussions,
    activeFile,
    onSelectFile,
  }: {
    changes: GitLabMergeRequestChangeDC[];
    discussions: GitLabDiscussionDC[];
    activeFile: IObservableValue<string | null>;
    onSelectFile: (fileKey: string) => void;
  }) => {
    const activeFileKey = activeFile.get();
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
    const [collapsedPaths, setCollapsedPaths] = useState(() => new Set<string>());
    const rows = useMemo(
      () => flattenVisibleRows(filteredTree, collapsedPaths),
      [filteredTree, collapsedPaths],
    );
    const getItemKey = useCallback((index: number) => rows[index].key, [rows]);
    const virtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => navRef.current,
      estimateSize: () => FILE_ROW_HEIGHT,
      getItemKey,
      paddingStart: 4,
      paddingEnd: 4,
      overscan: 8,
    });

    useEffect(() => {
      setCollapsedPaths((current) => current.size > 0 ? new Set() : current);
    }, [tree]);

    useLayoutEffect(() => {
      if (!activeFileKey) return;
      const ancestors = findFolderPathsToFile(tree, activeFileKey) ?? [];
      setCollapsedPaths((current) => {
        if (!ancestors.some((path) => current.has(path))) return current;
        const next = new Set(current);
        for (const path of ancestors) next.delete(path);
        return next;
      });
    }, [activeFileKey, tree]);

    const activeIndex = useMemo(
      () => rows.findIndex(({ key }) => key === activeFileKey),
      [activeFileKey, rows],
    );

    useLayoutEffect(() => {
      if (activeIndex >= 0) virtualizer.scrollToIndex(activeIndex, { align: "auto" });
    }, [activeIndex, activeFileKey, virtualizer]);

    const handleToggleFolder = useCallback((path: string) => {
      setCollapsedPaths((current) => {
        const next = new Set(current);
        if (!next.delete(path)) next.add(path);
        return next;
      });
    }, []);

    if (changes.length === 0) {
      return null;
    }

    return (
      <aside
        className="changes-file-tree flex max-h-[calc(100vh-2rem)] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--file-tree-border)] bg-[var(--file-tree-bg)]"
        style={{ "--file-row-height": `${FILE_ROW_HEIGHT}px` } as CSSProperties}
      >
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
          <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const { node, depth } = rows[item.index];
              return (
                <div
                  key={item.key}
                  className="absolute inset-x-0 top-0"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <TreeNodeView
                    node={node}
                    depth={depth}
                    expanded={!collapsedPaths.has(node.path)}
                    isActive={item.index === activeIndex}
                    hasDiscussions={node.type === "file" && fileKeysWithDiscussions.has(node.id)}
                    onToggleFolder={handleToggleFolder}
                    onSelectFile={onSelectFile}
                  />
                </div>
              );
            })}
          </div>
        </nav>
      </aside>
    );
  },
);
