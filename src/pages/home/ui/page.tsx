import { withViewModel } from "mobx-view-model-react";
import { cn } from "@/shared/lib/cn";
import { formatProjectCount } from "@/shared/lib/gitlab/format-project-count";
import { StatusMessage } from "@/shared/ui/status-message";
import { HomeVM } from "../model";
import { ProjectAvatar } from "./components/project-avatar";
import { ProjectsLoadMoreSentinel } from "./components/projects-load-more-sentinel";

export const HomePage = withViewModel(HomeVM, ({ model }) => {
  const { gitlabProjectsList } = model;

  return (
    <section className="max-w-[960px]">
      <h2 className="mb-4 text-2xl font-semibold">Проекты</h2>

      {model.isConfigured && (
        <nav
          aria-label="Категории проектов"
          className="flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-200 dark:border-slate-800"
        >
          {model.tabs.map((tab) => (
            <button
              key={tab.id}
              aria-current={tab.isActive ? "page" : undefined}
              className={cn(
                "relative mb-[-1px] flex items-center gap-1.5 border-b-2 pb-2.5 text-sm transition",
                tab.isActive
                  ? "border-[var(--color-accent-blue)] font-semibold text-slate-900 dark:text-slate-100"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
              type="button"
              onClick={() => model.setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.count != null && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {formatProjectCount(tab.count)}
                </span>
              )}
            </button>
          ))}
        </nav>
      )}

      {model.showConfigurePrompt && (
        <StatusMessage className="mt-4">
          Добавьте связку GitLab URL + токен в шапке.
        </StatusMessage>
      )}

      {model.showProjectsLoading && (
        <StatusMessage className="mt-4">Загружаем проекты...</StatusMessage>
      )}

      {model.showProjectsError && (
        <StatusMessage className="mt-4" error>
          {gitlabProjectsList.errorMessage}
        </StatusMessage>
      )}

      {model.showProjectsEmpty && (
        <StatusMessage className="mt-4">
          Проекты не найдены для {model.connectionLabel}.
        </StatusMessage>
      )}

      {model.showProjectsList && (
        <ul className="mt-1 flex list-none flex-col p-0">
          {gitlabProjectsList.projects.map((project) => (
            <li
              key={project.data.id}
              className="border-b border-slate-200 last:border-b-0 dark:border-slate-800"
            >
              <button
                className="flex w-full cursor-pointer items-center gap-2.5 px-1 py-2 text-left text-inherit transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
                type="button"
                onClick={() => model.openProject(project)}
              >
                <ProjectAvatar
                  className="h-7 w-7 shrink-0 rounded-md object-cover"
                  project={project}
                />

                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-200">
                    {project.name}
                  </span>
                  <span className="truncate text-xs text-slate-500">
                    {project.data.path_with_namespace}
                  </span>
                </span>
              </button>
            </li>
          ))}
          <ProjectsLoadMoreSentinel
            disabled={!model.canLoadMoreProjects}
            onLoadMore={() => model.loadMoreProjects()}
          />
        </ul>
      )}

      {model.showProjectsLoadingMore && (
        <StatusMessage className="mt-2">Загружаем ещё...</StatusMessage>
      )}
    </section>
  );
});
