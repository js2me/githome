import { observer } from 'mobx-react-lite';
import type { RepositoryTreeModel } from '../../../model/repository-tree';
import { TreeNode } from './tree-node';

export const FileTree = observer(
  ({ treeModel }: { treeModel: RepositoryTreeModel }) => {
    return (
      <aside className="glass-panel flex max-h-[min(40vh,320px)] w-full min-w-0 flex-col overflow-hidden rounded-xl lg:max-h-[calc(100vh-2rem)]">
        <div className="border-slate-200 border-b px-3 py-2.5 font-semibold text-slate-700 text-sm dark:border-slate-800 dark:text-slate-300">
          Files
        </div>

        <nav className="min-h-0 flex-1 overflow-auto p-1">
          {treeModel.isRootLoading && (
            <p className="px-2 py-2 text-slate-500 text-sm">
              Загружаем файлы...
            </p>
          )}

          {treeModel.rootErrorMessage && !treeModel.isRootLoading && (
            <p className="px-2 py-2 text-rose-600 text-sm dark:text-rose-400">
              {treeModel.rootErrorMessage}
            </p>
          )}

          {!treeModel.isRootLoading &&
            !treeModel.rootErrorMessage &&
            treeModel.rootItems.length === 0 && (
              <p className="px-2 py-2 text-slate-500 text-sm">
                Файлы не найдены.
              </p>
            )}

          {treeModel.rootItems.map((item) => (
            <TreeNode
              key={item.path}
              item={item}
              depth={0}
              treeModel={treeModel}
            />
          ))}
        </nav>
      </aside>
    );
  },
);
