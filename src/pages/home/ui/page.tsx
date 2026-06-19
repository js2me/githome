import { withViewModel } from "mobx-view-model-react";
import { StatusMessage } from "@/shared/ui/status-message";
import { HomeVM } from "../model";
import { ProjectAvatar } from "./components/project-avatar";

export const HomePage = withViewModel(HomeVM, ({ model }) => {
  const { gitlabProjectsList } = model;

  return (
    <section className="max-w-[760px]">
      <h2 className="mb-2 text-2xl font-semibold">Недавние репозитории</h2>
      <p className="m-0 text-slate-500">
        Выберите или добавьте связку GitLab URL + токен через кнопку слева от
        «Репозитории». Для активной связки загружаем до 10 часто используемых
        проектов.
      </p>

      {model.showConfigurePrompt && (
        <StatusMessage>
          Добавьте связку GitLab URL + токен через кнопку слева от «Репозитории».
        </StatusMessage>
      )}

      {model.showProjectsLoading && (
        <StatusMessage>Загружаем проекты...</StatusMessage>
      )}

      {model.showProjectsError && (
        <StatusMessage error>{gitlabProjectsList.errorMessage}</StatusMessage>
      )}

      {model.showProjectsEmpty && (
        <StatusMessage>
          Проекты не найдены для {model.connectionLabel}.
        </StatusMessage>
      )}

      {model.showProjectsList && (
        <ul className="mt-5 flex list-none flex-col gap-2.5 p-0">
          {gitlabProjectsList.projects.map((project) => (
            <li key={project.data.id}>
              <button
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-inherit transition hover:border-brand hover:shadow-[0_4px_16px_var(--color-card-hover-shadow)] dark:border-slate-800 dark:bg-gray-900 dark:hover:border-brand"
                type="button"
                onClick={() => model.openProject(project)}
              >
                <ProjectAvatar
                  className="h-10 w-10 shrink-0 rounded-[10px] object-cover"
                  project={project}
                />

                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-200">
                    {project.name}
                  </span>
                  <span className="truncate text-[13px] text-slate-500">
                    {project.data.path_with_namespace}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
