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
      <section>
        {model.isLoading && !project && (
          <StatusMessage>Загружаем репозиторий...</StatusMessage>
        )}

        {model.errorMessage && !project && (
          <StatusMessage error>{model.errorMessage}</StatusMessage>
        )}

        {project && (
          <>
            <h2 className="mb-4 text-[22px] font-semibold">{project.name}</h2>
            <p className="mb-4 text-sm text-slate-500">{project.path_with_namespace}</p>

            <div className="mb-4 flex gap-2">
              <button
                className="cursor-pointer rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-gray-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-950"
                type="button"
                onClick={model.openFiles}
              >
                Files
              </button>

              <button
                className="cursor-pointer rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-gray-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-950"
                type="button"
                onClick={model.openMergeRequests}
              >
                Merge requests
              </button>

              <button
                className="cursor-pointer rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-gray-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-950"
                type="button"
                onClick={model.openPipelines}
              >
                Pipelines
              </button>
            </div>

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
              <article className="mt-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-gray-900">
                <h3 className="mb-3 text-sm text-slate-500">{model.readme.file_name}</h3>
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
