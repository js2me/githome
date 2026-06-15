import { observer } from "mobx-react-lite";
import { useViewModel } from "mobx-view-model-react";
import type { GitLabProject } from "@/shared/api/gitlab";
import { RepositoryVM } from "@/pages/repository/model";
import { cn } from "@/shared/lib/cn";
import { LayoutVM } from "../model/layout-vm";

const navLinkClassName =
  "cursor-pointer rounded-lg border-none bg-transparent px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";

const ProjectAvatar = ({
  project,
  className,
}: {
  project: GitLabProject;
  className: string;
}) => {
  if (project.avatarUrl) {
    return <img className={className} src={project.avatarUrl} alt="" />;
  }

  return (
    <div
      className={cn(
        className,
        "grid place-items-center bg-gradient-to-br from-[#fc6d26] to-[#e24329] text-sm font-bold text-white",
      )}
    >
      {project.name.slice(0, 1).toUpperCase()}
    </div>
  );
};

export const RepoHeader = observer(() => {
  const model = useViewModel(LayoutVM);
  const { router, stores } = model.globals;
  const routes = router.routes;
  const projectId = RepositoryVM.resolveProjectId(model.globals);
  const cachedProject = stores.repository.project;
  const repository =
    cachedProject && projectId !== null && cachedProject.id === projectId
      ? cachedProject
      : null;
  const mergeRequestIid = RepositoryVM.resolveMergeRequestIid(model.globals);
  const isMergeRequestDetailOpen = routes.mergeRequest.isOpened;
  const isMergeRequestsOpen =
    routes.mergeRequests.isOpened || isMergeRequestDetailOpen;

  if (!router.isRepositorySectionOpen || !repository || projectId === null) {
    return null;
  }

  const projectIdParam = String(projectId);

  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-gray-900">
      <nav className="flex min-w-0 flex-1 items-center gap-1">
        <button
          className={navLinkClassName}
          type="button"
          onClick={() => {
            stores.repository.clear();
            void routes.home.open();
          }}
        >
          Репозитории
        </button>

        <span className="select-none text-sm text-slate-300 dark:text-slate-600">
          /
        </span>

        <button className={navLinkClassName} type="button" onClick={() => {
          void routes.repository.open({ projectId: projectIdParam });
        }}>
          <span className="flex min-w-0 items-center gap-2.5 px-2 py-0.5">
            <ProjectAvatar
              className="h-8 w-8 shrink-0 rounded-lg object-cover"
              project={repository}
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-bold text-slate-900 dark:text-slate-200">
                {repository.name}
              </span>
              <span className="truncate text-xs text-slate-500">
                {repository.pathWithNamespace}
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
            isMergeRequestsOpen &&
              !isMergeRequestDetailOpen &&
              "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
          )}
          type="button"
          onClick={() => {
            void routes.mergeRequests.open({ projectId: projectIdParam });
          }}
        >
          Merge Requests
        </button>

        {isMergeRequestDetailOpen && mergeRequestIid !== null && (
          <>
            <span className="select-none text-sm text-slate-300 dark:text-slate-600">
              /
            </span>
            <span className="max-w-80 truncate px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-200">
              !{mergeRequestIid}
            </span>
          </>
        )}
      </nav>
    </header>
  );
});
