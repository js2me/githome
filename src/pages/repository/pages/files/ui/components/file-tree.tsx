import { File, Folder, FolderOpen } from "@gravity-ui/icons";
import { observer } from "mobx-react-lite";
import type { GitLabRepositoryTreeItemDC } from "@/shared/api/gitlab";
import { cn } from "@/shared/lib/cn";
import type { RepositoryTreeModel } from "../../model/repository-tree";

const TreeNode = observer(
  ({
    item,
    depth,
    treeModel,
  }: {
    item: GitLabRepositoryTreeItemDC;
    depth: number;
    treeModel: RepositoryTreeModel;
  }) => {
    if (item.type === "tree") {
      const isExpanded = treeModel.isFolderExpanded(item.path);
      const isLoading = treeModel.isFolderLoading(item.path);
      const children = isExpanded ? treeModel.getFolderItems(item.path) : [];
      const errorMessage = treeModel.getFolderError(item.path);

      return (
        <div>
          <button
            className={cn(
              "flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md border-none bg-transparent px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            type="button"
            onClick={() => void treeModel.toggleFolder(item.path)}
          >
            <span className="shrink-0 text-slate-400">
              {isExpanded ? <FolderOpen width={16} height={16} /> : <Folder width={16} height={16} />}
            </span>
            <span className="min-w-0 truncate font-medium">{item.name}</span>
            {isLoading && (
              <span className="ml-auto shrink-0 text-xs text-slate-400">...</span>
            )}
          </button>

          {errorMessage && isExpanded && (
            <p
              className="px-2 py-1 text-xs text-rose-600 dark:text-rose-400"
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              {errorMessage}
            </p>
          )}

          {isExpanded &&
            children.map((child) => (
              <TreeNode
                key={child.path}
                item={child}
                depth={depth + 1}
                treeModel={treeModel}
              />
            ))}
        </div>
      );
    }

    const isActive = treeModel.selectedFilePath === item.path;

    return (
      <button
        className={cn(
          "flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md border-none px-2 py-1.5 text-left text-sm transition",
          isActive
            ? "bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300"
            : "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        type="button"
        onClick={() => treeModel.selectFile(item.path)}
      >
        <span className="shrink-0 text-slate-400">
          <File width={16} height={16} />
        </span>
        <span className="min-w-0 truncate">{item.name}</span>
      </button>
    );
  },
);

export const FileTree = observer(
  ({ treeModel }: { treeModel: RepositoryTreeModel }) => {
    return (
      <aside className="flex max-h-[calc(100vh-2rem)] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gray-900">
        <div className="border-b border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
          Files
        </div>

        <nav className="min-h-0 flex-1 overflow-auto p-1">
          {treeModel.isRootLoading && (
            <p className="px-2 py-2 text-sm text-slate-500">Загружаем файлы...</p>
          )}

          {treeModel.rootErrorMessage && !treeModel.isRootLoading && (
            <p className="px-2 py-2 text-sm text-rose-600 dark:text-rose-400">
              {treeModel.rootErrorMessage}
            </p>
          )}

          {!treeModel.isRootLoading &&
            !treeModel.rootErrorMessage &&
            treeModel.rootItems.length === 0 && (
              <p className="px-2 py-2 text-sm text-slate-500">Файлы не найдены.</p>
            )}

          {treeModel.rootItems.map((item) => (
            <TreeNode key={item.path} item={item} depth={0} treeModel={treeModel} />
          ))}
        </nav>
      </aside>
    );
  },
);
