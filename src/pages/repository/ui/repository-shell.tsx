import { observer } from "mobx-react-lite";
import type { ReactNode } from "react";
import { useViewModel, withViewModel } from "mobx-view-model-react";
import { RepositoryPageVM } from "@/pages/repository/model";
import { cn } from "@/shared/lib/cn";
import { LayoutVM } from "@/widgets/layout/model/layout-vm";

const sidebarLinkClassName =
  "w-full cursor-pointer rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-gray-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-950";

const RepositoryShellLayout = observer(({ children }: { children?: ReactNode }) => {
  const model = useViewModel(LayoutVM);

  if (!model.isRepositorySidebarVisible) {
    if (model.isMergeRequestDetailOpen) {
      return <div className="min-w-0">{children}</div>;
    }

    return null;
  }

  return (
    <div className="grid grid-cols-[220px_minmax(0,1fr)] items-start gap-6">
      <aside className="sticky top-4">
        <nav className="flex flex-col gap-1.5">
          <button
            className={cn(
              sidebarLinkClassName,
              model.isRepositoryOverviewOpen &&
                "border-brand bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
            )}
            type="button"
            onClick={model.openRepository}
          >
            Обзор
          </button>

          <button
            className={cn(
              sidebarLinkClassName,
              model.isMergeRequestsOpen &&
                "border-brand bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
            )}
            type="button"
            onClick={model.openMergeRequests}
          >
            Merge requests
          </button>
        </nav>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
});

export const RepositoryShell = withViewModel(
  RepositoryPageVM,
  RepositoryShellLayout,
);
