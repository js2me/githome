import {
  ChevronDown,
  CodePullRequest,
  Folders,
  Magnifier,
  Timeline,
} from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { formatProjectCount } from '@/shared/lib/gitlab/format-project-count';
import { t } from '@/shared/lib/i18n';
import { LoadMoreSentinel } from '@/shared/ui/load-more-sentinel';
import { ProjectAvatar } from '@/shared/ui/project-avatar';
import { StatusMessage } from '@/shared/ui/status-message';
import type { HomePageVM } from '../../model';
import type { ProjectListTab } from '../../model/gitlab-projects-list';

export const ProjectExplorer = observer(({ model }: { model: HomePageVM }) => {
  const {
    gitlabProjectsList,
    projectFilter: filter,
    visibleProjects: projects,
  } = model;
  const query = filter.trim();
  return (
    <section
      className="home-panel home-projects"
      aria-labelledby="home-projects-title"
    >
      <header className="home-panel-header">
        <h2 id="home-projects-title">
          <Folders className="size-4 text-fg-muted" aria-hidden />
          {t('home.projects')}
        </h2>
      </header>
      <div className="home-explorer-tools">
        <div className="relative">
          <select
            aria-label={t('home.projectCategory')}
            className="glass-control home-project-category"
            value={gitlabProjectsList.activeTab}
            onChange={(event) =>
              model.setActiveTab(event.target.value as ProjectListTab)
            }
          >
            {model.tabs.map(({ id, label, count }) => (
              <option key={id} value={id}>
                {label}
                {count != null ? ` · ${formatProjectCount(count)}` : ''}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-fg-muted"
            aria-hidden
          />
        </div>
        <label className="glass-input home-project-search">
          <Magnifier className="size-4 shrink-0 text-fg-muted" aria-hidden />
          <input
            aria-label={t('workbench.filterProjects')}
            placeholder={t('workbench.filterProjects')}
            type="search"
            value={filter}
            onChange={(event) => model.setProjectFilter(event.target.value)}
          />
        </label>
      </div>
      <div className="home-explorer-list">
        {model.showProjectsLoading && (
          <p className="home-explorer-message" role="status">
            {t('home.loadingProjects')}
          </p>
        )}
        {model.showProjectsError && (
          <StatusMessage className="m-2 break-words" error>
            {gitlabProjectsList.errorMessage}
          </StatusMessage>
        )}
        {model.showProjectsEmpty && (
          <p className="home-explorer-message">
            {t('home.noProjectsFor', { connection: model.connectionLabel })}
          </p>
        )}
        {model.showProjectsList && (
          <>
            {projects.length ? (
              <ul className="list-none">
                {projects.map((project) => (
                  <li key={project.data.id} className="home-project">
                    <button
                      className="home-project-row"
                      type="button"
                      title={project.data.path_with_namespace}
                      onClick={() => model.openProject(project)}
                    >
                      <ProjectAvatar
                        className="size-6 shrink-0 rounded-md object-cover"
                        id={project.data.id}
                        avatarUrl={project.data.avatar_url}
                        name={project.name}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-[13px]">
                          {project.name}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-fg-muted">
                          {project.data.path_with_namespace}
                        </span>
                      </span>
                    </button>
                    <button
                      className="home-project-action"
                      type="button"
                      aria-label={t('home.mergeRequestsFor', {
                        v1: project.data.path_with_namespace,
                      })}
                      title={t('home.mergeRequestsFor', {
                        v1: project.name,
                      })}
                      onClick={() => model.openProjectMergeRequests(project)}
                    >
                      <CodePullRequest className="size-4" aria-hidden />
                    </button>
                    <button
                      className="home-project-action"
                      type="button"
                      aria-label={t('home.pipelinesFor', {
                        v1: project.data.path_with_namespace,
                      })}
                      title={t('home.pipelinesFor', { v1: project.name })}
                      onClick={() => model.openProjectPipelines(project)}
                    >
                      <Timeline className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="home-explorer-message" role="status">
                {t('workbench.noMatchingProjects')}
              </p>
            )}
            {query ? (
              model.canLoadMoreProjects && (
                <button
                  type="button"
                  className="glass-control m-2 rounded-md px-3 py-1.5 text-xs"
                  onClick={model.loadMoreProjects}
                >
                  {t('home.showMore')}
                </button>
              )
            ) : (
              <LoadMoreSentinel
                disabled={!model.canLoadMoreProjects}
                onLoadMore={model.loadMoreProjects}
              />
            )}
          </>
        )}
        {model.showProjectsLoadingMore && (
          <p className="home-explorer-message" role="status">
            {t('home.loadingMoreProjects')}
          </p>
        )}
      </div>
    </section>
  );
});
