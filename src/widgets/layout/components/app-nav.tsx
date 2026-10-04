import { observer } from "mobx-react-lite";
import { useViewModel } from "mobx-view-model-react";
import { cn } from "@/shared/lib/cn";
import { ProjectAvatar } from "@/shared/ui/project-avatar";
import { LayoutVM } from "../model/layout-vm";
import { ConnectionPicker } from "./connection-picker";
import { SettingsPopup } from "./settings-popup";

const navLinkClassName =
  "cursor-pointer rounded-lg border-none bg-transparent px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";

export const AppNav = observer(() => {
  const model = useViewModel<LayoutVM>();

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-gray-900 sm:px-4 lg:flex-nowrap lg:gap-4 lg:px-5 lg:py-3">
      <div className="order-1 flex shrink-0 items-center gap-2.5 lg:order-none">
        <div
          className="grid h-[25px] w-[25px] place-items-center rounded-[10px] bg-gradient-to-br from-brand to-brand-gradient-to text-xs font-bold text-white"
          aria-hidden
        >
          GH
        </div>
        <h1 className="m-0 text-lg font-bold tracking-tight">GitHome</h1>
      </div>

      <div
        className="hidden h-6 w-px shrink-0 bg-slate-200 dark:bg-slate-700 lg:block"
        aria-hidden
      />

      <nav className="order-3 flex basis-full min-w-0 flex-wrap items-center gap-1 lg:order-none lg:basis-auto lg:flex-1 lg:flex-nowrap">
        <ConnectionPicker />

        {model.repositoryBreadcrumb && (
          <>
            <span className="select-none text-sm text-slate-300 dark:text-slate-600">
              /
            </span>

            <button
              className={navLinkClassName}
              type="button"
              onClick={model.openRepository}
            >
              <span className="flex min-w-0 items-center gap-2.5 px-2 py-0.5">
                <ProjectAvatar
                  className="h-[25px] w-[25px] shrink-0 rounded-lg object-cover"
                  id={model.repositoryBreadcrumb.id}
                  avatarUrl={model.repositoryBreadcrumb.avatar_url}
                  name={model.repositoryBreadcrumb.name}
                />
                <span className="min-w-0 truncate text-[15px] font-bold text-slate-900 dark:text-slate-200">
                  {model.repositoryBreadcrumb.name}{" "}
                  <span className="font-normal text-slate-500">
                    ({model.repositoryBreadcrumb.path_with_namespace})
                  </span>
                </span>
              </span>
            </button>

            {model.isFilesOpen && (
              <>
                <span className="select-none text-sm text-slate-300 dark:text-slate-600">
                  /
                </span>

                <button
                  className={cn(
                    navLinkClassName,
                    model.isFilesNavActive &&
                      "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
                  )}
                  type="button"
                  onClick={model.openFiles}
                >
                  Files
                </button>
              </>
            )}

            {model.isMergeRequestsOpen && (
              <>
                <span className="select-none text-sm text-slate-300 dark:text-slate-600">
                  /
                </span>

                <button
                  className={cn(
                    navLinkClassName,
                    model.isMergeRequestsNavActive &&
                      "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
                  )}
                  type="button"
                  onClick={model.openMergeRequests}
                >
                  Merge Requests
                </button>

                {model.showMergeRequestBreadcrumb && (
                  <>
                    <span className="select-none text-sm text-slate-300 dark:text-slate-600">
                      /
                    </span>
                    <span className="max-w-80 truncate px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-200">
                      !{model.mergeRequestIid}
                    </span>
                  </>
                )}
              </>
            )}

            {model.isPipelinesOpen && (
              <>
                <span className="select-none text-sm text-slate-300 dark:text-slate-600">
                  /
                </span>

                <button
                  className={cn(
                    navLinkClassName,
                    "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
                  )}
                  type="button"
                  onClick={model.openPipelines}
                >
                  Pipelines
                </button>
              </>
            )}

            {model.isAnalyticsOpen && (
              <>
                <span className="select-none text-sm text-slate-300 dark:text-slate-600">
                  /
                </span>

                <button
                  className={cn(
                    navLinkClassName,
                    "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
                  )}
                  type="button"
                  onClick={model.openAnalytics}
                >
                  Аналитика
                </button>
              </>
            )}
          </>
        )}
      </nav>

      <div className="order-2 ml-auto lg:order-none lg:ml-0">
        <SettingsPopup />
      </div>
    </header>
  );
});
