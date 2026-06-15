import { observer } from "mobx-react-lite";
import type { ReactNode } from "react";
import { useViewModel } from "mobx-view-model-react";
import { RepositoryVM } from "@/pages/repository/model";
import { cn } from "@/shared/lib/cn";
import { LayoutVM } from "@/widgets/layout/model/layout-vm";

const sidebarLinkClassName =
  "w-full cursor-pointer rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-gray-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-950";

export const RepositoryShell = observer(({ children }: { children?: ReactNode }) => {
  const model = useViewModel(LayoutVM);
  const { router } = model.globals;
  const projectId = RepositoryVM.resolveProjectId(model.globals);
  const isMergeRequestsOpen =
    router.routes.mergeRequests.isOpened || router.routes.mergeRequest.isOpened;
  const isOverviewOpen = router.routes.repository.isOpened;

  if (!projectId) {
    return null;
  }

  const projectIdParam = String(projectId);

  return (
    <div className="grid grid-cols-[220px_minmax(0,1fr)] items-start gap-6">
      <aside className="sticky top-4">
        <nav className="flex flex-col gap-1.5">
          <button
            className={cn(
              sidebarLinkClassName,
              isOverviewOpen &&
                "border-[#fc6d26] bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
            )}
            type="button"
            onClick={() => {
              void router.routes.repository.open({ projectId: projectIdParam });
            }}
          >
            Обзор
          </button>

          <button
            className={cn(
              sidebarLinkClassName,
              isMergeRequestsOpen &&
                "border-[#fc6d26] bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
            )}
            type="button"
            onClick={() => {
              void router.routes.mergeRequests.open({ projectId: projectIdParam });
            }}
          >
            Merge requests
          </button>
        </nav>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
});
