import { observer } from "mobx-react-lite";
import { useViewModel } from "mobx-view-model-react";
import type { GitLabProjectDC } from "@/shared/api/gitlab";
import { cn } from "@/shared/lib/cn";
import { LayoutVM } from "../model/layout-vm";
import { ConnectionPicker } from "./connection-picker";

const navLinkClassName =
  "cursor-pointer rounded-lg border-none bg-transparent px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";

const ProjectAvatar = ({
  project,
  className,
}: {
  project: GitLabProjectDC;
  className: string;
}) => {
  if (project.avatar_url) {
    return <img className={className} src={project.avatar_url} alt="" />;
  }

  return (
    <div
      className={cn(
        className,
        "grid place-items-center bg-gradient-to-br from-brand to-brand-gradient-to text-sm font-bold text-white",
      )}
    >
      {project.name.slice(0, 1).toUpperCase()}
    </div>
  );
};

export const AppNav = observer(() => {
  const model = useViewModel(LayoutVM);

  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-gray-900">
      <div className="flex shrink-0 items-center gap-2.5">
        <div
          className="grid h-[25px] w-[25px] place-items-center rounded-[10px] bg-gradient-to-br from-brand to-brand-gradient-to text-xs font-bold text-white"
          aria-hidden
        >
          GH
        </div>
        <h1 className="m-0 text-lg font-bold tracking-tight">GitHome</h1>
      </div>

      <div
        className="h-6 w-px shrink-0 bg-slate-200 dark:bg-slate-700"
        aria-hidden
      />

      <nav className="flex min-w-0 flex-1 items-center gap-1">
        <ConnectionPicker />

        <span className="select-none text-sm text-slate-300 dark:text-slate-600">
          /
        </span>

        <button
          className={cn(
            navLinkClassName,
            model.isHomeOpen &&
            "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
          )}
          type="button"
          onClick={model.openRepositories}
        >
          Репозитории
        </button>

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
                  project={model.repositoryBreadcrumb}
                />
                <span className="min-w-0 truncate text-[15px] font-bold text-slate-900 dark:text-slate-200">
                  {model.repositoryBreadcrumb.name}{" "}
                  <span className="font-normal text-slate-500">
                    ({model.repositoryBreadcrumb.path_with_namespace})
                  </span>
                </span>
              </span>
            </button>

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
      </nav>
    </header>
  );
});
