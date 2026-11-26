import {
  BookOpen,
  ChartLine,
  Code,
  CodePullRequest,
  Timeline,
} from '@gravity-ui/icons';
import { RouteView, RouteViewGroup } from 'mobx-route/react';
import { withViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { GitLabMarkdown } from '@/shared/ui/gitlab-markdown/gitlab-markdown';
import { ProjectAvatar } from '@/shared/ui/project-avatar';
import { StatusMessage } from '@/shared/ui/status-message';
import { RepositoryPageVM } from '../model/page-vm';
import { AnalyticsPage } from './routes/analytics-page';
import { FilesPage } from './routes/files-page';
import { MergeRequestPage } from './routes/merge-request-page';
import { MergeRequestsPage } from './routes/merge-requests-page';
import { PipelinesPage } from './routes/pipelines-page';

export const RepositoryPage = withViewModel(RepositoryPageVM, ({ model }) => {
  const project = model.project;
  const connection = model.globals.stores.settings.activeConnection;
  const projectPath = project?.path_with_namespace ?? '';

  return (
    <RouteViewGroup suspense fallback={null}>
      <RouteView route={model.globals.routes.files} view={FilesPage} />
      <RouteView
        route={model.globals.routes.mergeRequests}
        view={MergeRequestsPage}
      />
      <RouteView
        route={model.globals.routes.mergeRequest}
        view={MergeRequestPage}
      />
      <RouteView route={model.globals.routes.pipelines} view={PipelinesPage} />
      <RouteView route={model.globals.routes.analytics} view={AnalyticsPage} />
      <section className="mx-auto max-w-page">
        {model.isLoading && !project && (
          <StatusMessage>{t('files.loadingRepository')}</StatusMessage>
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
                  <h2 className="break-words font-semibold text-2xl leading-tight tracking-tight">
                    {project.name}
                  </h2>
                  <p
                    className="mt-1 truncate text-fg-muted text-sm"
                    title={projectPath}
                  >
                    {projectPath}
                  </p>
                </div>
              </div>
              <nav
                aria-label={t('repository.projectSections')}
                className="flex flex-wrap gap-2"
              >
                <button
                  type="button"
                  onClick={model.openMergeRequests}
                  className="glass-primary inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 font-semibold text-sm"
                >
                  <CodePullRequest className="size-4" aria-hidden />
                  <span>{t('common.mergeRequests')}</span>
                </button>
                {[
                  {
                    label: t('common.files'),
                    Icon: Code,
                    open: model.openFiles,
                  },
                  {
                    label: t('pipelines.pipelines'),
                    Icon: Timeline,
                    open: model.openPipelines,
                  },
                  {
                    label: t('analytics.analytics'),
                    Icon: ChartLine,
                    open: model.openAnalytics,
                  },
                ].map(({ label, Icon, open }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={open}
                    className="glass-control inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 font-semibold text-sm"
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </button>
                ))}
              </nav>
            </header>

            {model.isReadmeLoading && (
              <StatusMessage>{t('repository.loadingReadme')}</StatusMessage>
            )}

            {model.readmeErrorMessage && !model.isReadmeLoading && (
              <StatusMessage error>{model.readmeErrorMessage}</StatusMessage>
            )}

            {model.showReadmeMissing && (
              <StatusMessage>{t('repository.readmeNotFound')}</StatusMessage>
            )}

            {model.readme && (
              <article className="glass-panel mt-2 rounded-2xl p-5 sm:p-6">
                <h3 className="mb-4 flex items-center gap-2 border-[var(--glass-border)] border-b pb-3 font-medium text-fg-muted text-sm">
                  <BookOpen className="size-4" aria-hidden />
                  {model.readme.file_name}
                </h3>
                <GitLabMarkdown
                  connection={connection}
                  projectPath={projectPath}
                  projectId={project.id}
                  text={model.readme.content}
                  className="text-slate-800 text-sm leading-normal dark:text-slate-300"
                />
              </article>
            )}
          </>
        )}
      </section>
    </RouteViewGroup>
  );
});
