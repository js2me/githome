import { withViewModel } from "mobx-view-model-react";
import { HomeVM } from "../model";

export const HomePage = withViewModel(HomeVM, ({ model }) => {
  return (
    <section className="home-page">
      <h2>Недавние репозитории</h2>
      <p>
        Выберите или добавьте связку GitLab URL + токен в шапке. Для активной
        связки загружаем до 10 часто используемых проектов.
      </p>

      {!model.isConfigured && (
        <div className="home-page__status">
          Добавьте связку GitLab URL + токен в шапке.
        </div>
      )}

      {model.isConfigured && model.isLoading && (
        <div className="home-page__status">Загружаем проекты...</div>
      )}

      {model.isConfigured && model.errorMessage && !model.isLoading && (
        <div className="home-page__status home-page__status--error">
          {model.errorMessage}
        </div>
      )}

      {model.isConfigured &&
        !model.isLoading &&
        !model.errorMessage &&
        model.projects.length === 0 && (
          <div className="home-page__status">
            Проекты не найдены для {model.connectionLabel}.
          </div>
        )}

      {model.projects.length > 0 && (
        <ul className="project-list">
          {model.projects.map((project) => (
            <li key={project.id} className="project-list__item">
              <a
                className="project-list__link"
                href={project.webUrl}
                rel="noreferrer"
                target="_blank"
              >
                {project.avatarUrl ? (
                  <img
                    className="project-list__avatar"
                    src={project.avatarUrl}
                    alt=""
                  />
                ) : (
                  <div className="project-list__avatar project-list__avatar--placeholder">
                    {project.name.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <span className="project-list__content">
                  <span className="project-list__name">{project.name}</span>
                  <span className="project-list__path">
                    {project.pathWithNamespace}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
