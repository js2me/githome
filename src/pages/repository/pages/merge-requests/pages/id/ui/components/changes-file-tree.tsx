import { memo, useEffect, useMemo, useState } from "react";
import type { GitLabMergeRequestChange } from "@/shared/api/gitlab";
import {
  buildChangesTree,
  type ChangeFileStatus,
  type ChangesTreeNode,
} from "@/shared/lib/build-changes-tree";
import { cn } from "@/shared/lib/cn";
import { scrollToDiffFile } from "@/shared/lib/scroll-to-diff-file";

const statusLabels: Record<ChangeFileStatus, string> = {
  added: "A",
  deleted: "D",
  renamed: "R",
  modified: "M",
};

const statusClassName: Record<ChangeFileStatus, string> = {
  added: "text-[#1f883d] dark:text-[#3fb950]",
  deleted: "text-[#c9190b] dark:text-[#ff7b72]",
  renamed: "text-blue-600 dark:text-blue-300",
  modified: "text-[#9a6700] dark:text-[#d29922]",
};

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    aria-hidden="true"
    className={cn(
      "h-3 w-3 shrink-0 text-slate-400 transition-transform",
      expanded && "rotate-90",
    )}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 4l4 4-4 4" />
  </svg>
);

const FileIcon = () => (
  <svg
    aria-hidden="true"
    className="h-3.5 w-3.5 shrink-0 text-slate-400"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 2.5h5.5L12 5v8.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
    <path d="M9.5 2.5V5H12" />
  </svg>
);

const FolderIcon = ({ open }: { open: boolean }) => (
  <svg
    aria-hidden="true"
    className="h-3.5 w-3.5 shrink-0 text-[#fc6d26]"
    viewBox="0 0 16 16"
    fill="currentColor"
  >
    {open ? (
      <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6l1.2 1.2H13.5A1 1 0 0 1 14.5 4.7v7.8a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1v-8.2z" />
    ) : (
      <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6l1.2 1.2H13.5A1 1 0 0 1 14.5 4.7v1.3H1.5v-2.5z" />
    )}
  </svg>
);

const TreeNodeView = memo(
  ({
    node,
    depth,
    activeFileKey,
    expandedPaths,
    onToggleFolder,
    onSelectFile,
  }: {
    node: ChangesTreeNode;
    depth: number;
    activeFileKey: string | null;
    expandedPaths: Set<string>;
    onToggleFolder: (path: string) => void;
    onSelectFile: (change: GitLabMergeRequestChange) => void;
  }) => {
    if (node.type === "folder") {
      const expanded = expandedPaths.has(node.path);

      return (
        <div>
          <button
            className="flex w-full min-w-0 cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-left text-[12px] text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            type="button"
            style={{ paddingLeft: `${depth * 12 + 6}px` }}
            onClick={() => onToggleFolder(node.path)}
          >
            <ChevronIcon expanded={expanded} />
            <FolderIcon open={expanded} />
            <span className="truncate font-medium">{node.name}</span>
          </button>

          {expanded && (
            <div>
              {node.children.map((child) => (
                <TreeNodeView
                  key={child.type === "folder" ? `folder:${child.path}` : child.id}
                  node={child}
                  depth={depth + 1}
                  activeFileKey={activeFileKey}
                  expandedPaths={expandedPaths}
                  onToggleFolder={onToggleFolder}
                  onSelectFile={onSelectFile}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    const isActive = activeFileKey === node.id;

    return (
      <button
        className={cn(
          "flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-left text-[12px] transition",
          isActive
            ? "bg-[#fff1e8] text-[#303030] dark:bg-[#3d2b1f] dark:text-[#f0f6fc]"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        )}
        type="button"
        style={{ paddingLeft: `${depth * 12 + 22}px` }}
        title={node.path}
        onClick={() => onSelectFile(node.change)}
      >
        <span
          className={cn(
            "w-3 shrink-0 text-center font-mono text-[10px] font-bold",
            statusClassName[node.status],
          )}
        >
          {statusLabels[node.status]}
        </span>
        <FileIcon />
        <span className="truncate">{node.name}</span>
      </button>
    );
  },
);

const collectFolderPaths = (nodes: ChangesTreeNode[]): string[] => {
  const paths: string[] = [];

  for (const node of nodes) {
    if (node.type === "folder") {
      paths.push(node.path, ...collectFolderPaths(node.children));
    }
  }

  return paths;
};

export const ChangesFileTree = memo(
  ({
    changes,
    activeFileKey,
  }: {
    changes: GitLabMergeRequestChange[];
    activeFileKey: string | null;
  }) => {
    const tree = useMemo(() => buildChangesTree(changes), [changes]);
    const folderPaths = useMemo(() => collectFolderPaths(tree), [tree]);
    const [expandedPaths, setExpandedPaths] = useState(
      () => new Set(folderPaths),
    );

    useEffect(() => {
      setExpandedPaths(new Set(folderPaths));
    }, [folderPaths]);

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
      <aside className="sticky top-4 flex max-h-[calc(100vh-2rem)] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gray-900">
        <div className="border-b border-slate-200 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800">
          Changes ({changes.length})
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1.5">
          {tree.map((node) => (
            <TreeNodeView
              key={node.type === "folder" ? `folder:${node.path}` : node.id}
              node={node}
              depth={0}
              activeFileKey={activeFileKey}
              expandedPaths={expandedPaths}
              onToggleFolder={handleToggleFolder}
              onSelectFile={scrollToDiffFile}
            />
          ))}
        </nav>
      </aside>
    );
  },
);
