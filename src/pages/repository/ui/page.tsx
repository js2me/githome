import { BookOpen, ChartLine, Code, CodePullRequest, Timeline } from "@gravity-ui/icons";
import { ProjectAvatar } from "@/shared/ui/project-avatar";
import { withViewModel } from "mobx-view-model-react";
import { StatusMessage } from "@/shared/ui/status-message";
import { GitLabMarkdown } from "@/shared/ui/gitlab-markdown/gitlab-markdown";
import { RepositoryPageVM } from "../model/page-vm";
import { RouteView, RouteViewGroup } from "mobx-route/react";
import { lazy } from "react";

const MergeRequestsPage = lazy(() =>
  import("@/pages/repository/pages/merge-requests/ui/page").then((module) => ({
    default: module.MergeRequestsPage,
  })),
);

const FilesPage = lazy(() =>
  import("@/pages/repository/pages/files/ui/page").then((module) => ({
    default: module.FilesPage,
  })),
);

const PipelinesPage = lazy(() =>
  import("@/pages/repository/pages/pipelines/ui/page").then((module) => ({
    default: module.PipelinesPage,
  })),
);

const AnalyticsPage = lazy(() =>
  import("@/pages/repository/pages/analytics/ui/page").then((module) => ({
    default: module.AnalyticsPage,
  })),
);

const MergeRequestPage = lazy(() =>
  import("@/pages/repository/pages/merge-requests/pages/[id]/ui/page").then(
    (module) => ({
      default: module.MergeRequestPage,
    }),
  ),
);

export const RepositoryPage = withViewModel(RepositoryPageVM, ({ model }) => {
  const project = model.project;
  const connection = model.globals.stores.settings.activeConnection;
  const projectPath = project?.path_with_namespace ?? "";

  return (
    <RouteViewGroup suspense fallback={null}>
      <RouteView route={model.globals.routes.files} view={FilesPage} />
      <RouteView route={model.globals.routes.mergeRequests} view={MergeRequestsPage} />
      <RouteView route={model.globals.routes.mergeRequest} view={MergeRequestPage} />
      <RouteView route={model.globals.routes.pipelines} view={PipelinesPage} />
      <RouteView route={model.globals.routes.analytics} view={AnalyticsPage} />
      <section className="mx-auto max-w-[1180px]">
        {model.isLoading && !project && (
          <StatusMessage>Загружаем репозиторий...</StatusMessage>
        )}

        {model.errorMessage && !project && (
          <StatusMessage error>{model.errorMessage}</StatusMessage>
        )}

        {project && (
          <>
            <header className="glass-panel mb-5 flex flex-wrap items-center justify-between gap-5 rounded-2xl p-5 sm:p-6">
              <div className="flex min-w-0 items-center gap-4">
                <ProjectAvatar
                  className="size-12 shrink-0 rounded-xl object-cover"
                  id={project.id}
                  avatarUrl={project.avatar_url}
                  name={project.name}
                />
                <div className="min-w-0">
                  <h2 className="break-words text-2xl leading-tight font-semibold tracking-tight">{project.name}</h2>
                  <p className="mt-1 truncate text-sm text-fg-muted" title={projectPath}>{projectPath}</p>
                </div>
              </div>
              <nav aria-label="Разделы проекта" className="flex flex-wrap gap-2">
                <button type="button" onClick={model.openMergeRequests} className="glass-primary inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold">
                  <CodePullRequest className="size-4" aria-hidden />
                  <span>Merge requests</span>
                </button>
                {[
                  { label: "Files", Icon: Code, open: model.openFiles },
                  { label: "Pipelines", Icon: Timeline, open: model.openPipelines },
                  { label: "Аналитика", Icon: ChartLine, open: model.openAnalytics },
                ].map(({ label, Icon, open }) => (
                  <button key={label} type="button" onClick={open} className="glass-control inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold">
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </button>
                ))}
              </nav>
            </header>

            {model.isReadmeLoading && (
              <StatusMessage>Загружаем README...</StatusMessage>
            )}

            {model.readmeErrorMessage && !model.isReadmeLoading && (
              <StatusMessage error>{model.readmeErrorMessage}</StatusMessage>
            )}

            {model.showReadmeMissing && (
              <StatusMessage>README не найден.</StatusMessage>
            )}

            {model.readme && (
              <article className="glass-panel mt-2 rounded-2xl p-5 sm:p-6">
                <h3 className="mb-4 flex items-center gap-2 border-b border-[var(--glass-border)] pb-3 text-sm font-medium text-fg-muted"><BookOpen className="size-4" aria-hidden />{model.readme.file_name}</h3>
                <GitLabMarkdown
                  connection={connection}
                  projectPath={projectPath}
                  projectId={project.id}
                  text={model.readme.content}
                  className="text-sm leading-normal text-slate-800 dark:text-slate-300"
                />
              </article>
            )}
          </>
        )}
      </section>
    </RouteViewGroup>
  );
});
