import { observer } from "mobx-react-lite";
import { useViewModel } from "mobx-view-model-react";
import { StatusMessage } from "@/shared/ui/status-message";
import {
  GitLabMarkdown,
  GitLabMarkdownProvider,
} from "@/shared/ui/gitlab-markdown/gitlab-markdown";
import { RepositoryPageVM } from "../model";

export const RepositoryPage = observer(() => {
  const model = useViewModel(RepositoryPageVM);
  const project = model.project;
  const connection = model.globals.stores.settings.activeConnection;
  const projectPath = project?.path_with_namespace ?? "";

  return (
    <GitLabMarkdownProvider connection={connection} projectPath={projectPath}>
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
                  text={model.readme.content}
                  className="text-sm leading-normal text-slate-800 dark:text-slate-300"
                />
              </article>
            )}
          </>
        )}
      </section>
    </GitLabMarkdownProvider>
  );
});
