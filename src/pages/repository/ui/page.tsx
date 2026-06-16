import { withViewModel } from "mobx-view-model-react";
import { StatusMessage } from "@/shared/ui/status-message";
import { GitLabMarkdown } from "@/shared/ui/gitlab-markdown/gitlab-markdown";
import { RepositoryVM } from "../model";

export const RepositoryPage = withViewModel(RepositoryVM, ({ model }) => {
  const project = model.project;

  return (
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
          <p className="mb-4 text-sm text-slate-500">{project.pathWithNamespace}</p>

          {model.isReadmeLoading && (
            <StatusMessage>Загружаем README...</StatusMessage>
          )}

          {model.readmeErrorMessage && !model.isReadmeLoading && (
            <StatusMessage error>{model.readmeErrorMessage}</StatusMessage>
          )}

          {!model.isReadmeLoading &&
            !model.readmeErrorMessage &&
            model.readme === null && (
              <StatusMessage>README не найден.</StatusMessage>
            )}

          {model.readme && (
            <article className="mt-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-gray-900">
              <h3 className="mb-3 text-sm text-slate-500">{model.readme.fileName}</h3>
              <GitLabMarkdown
                text={model.readme.content}
                className="text-sm leading-normal text-slate-800 dark:text-slate-300"
              />
            </article>
          )}
        </>
      )}
    </section>
  );
});
