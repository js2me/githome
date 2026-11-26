import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  CodePullRequest,
  Folders,
  LogoGitlab,
} from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import { formatProjectCount } from '@/shared/lib/gitlab/format-project-count';
import { t } from '@/shared/lib/i18n';
import { LoadMoreSentinel } from '@/shared/ui/load-more-sentinel';
import { ProjectAvatar } from '@/shared/ui/project-avatar';
import { StatusMessage } from '@/shared/ui/status-message';
import { HomePageVM } from '../model';
import type { ProjectListTab } from '../model/gitlab-projects-list';
import { InboxPageRows } from './inbox-page-rows';
import './page.css';
import { BranchDiagram } from './components/branch-diagram';

export const HomePage = withViewModel(
  HomePageVM,
  ({ model }) => {
    const { gitlabProjectsList, reviewInbox } = model;

    if (!model.isConfigured) {
      return (
        <section className="home-welcome glass-panel mx-auto max-w-page rounded-3xl">
          <div className="relative z-10 max-w-lg">
            <LogoGitlab
              className="mb-6 size-9 text-[var(--glass-accent)]"
              aria-hidden
            />
            <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
              {t('common.connectToGitlab')}
            </h2>
            <p className="mt-3 max-w-sm text-fg-muted text-sm leading-relaxed sm:text-base">
              {t('home.enterTheServerAddressAndAnAccess')}
            </p>
            <button
              type="button"
              className="glass-primary mt-6 inline-flex items-center gap-3 rounded-xl px-4 py-2.5 font-semibold text-sm"
              onClick={model.parentViewModel.openConnectionPopup}
            >
              {t('home.setUpAConnection')}{' '}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
          <BranchDiagram />
        </section>
      );
    }

    return (
      <div className="home-dashboard mx-auto grid max-w-page items-start gap-5">
        <section
          className="glass-panel min-w-0 rounded-2xl"
          aria-labelledby="home-reviews-title"
        >
          <header className="home-review-header relative overflow-hidden rounded-t-2xl px-5 pt-6 sm:px-7 sm:pt-8">
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h2
                id="home-reviews-title"
                className="font-semibold text-[clamp(1.65rem,3vw,2.15rem)] leading-tight tracking-tight"
              >
                {t('common.mergeRequests')}
              </h2>
              <a
                href="#home-projects-title"
                className="glass-control inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold text-xs min-[960px]:hidden"
              >
                {t('home.projects')}{' '}
                <ChevronDown className="size-3" aria-hidden />
              </a>
            </div>
            <div
              className="relative z-10 mt-5 mb-5 inline-flex gap-1 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-control)] p-1"
              role="group"
              aria-label={t('home.myMergeRequests')}
            >
              {(['reviewer', 'author'] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  aria-pressed={reviewInbox.scope === scope}
                  className={cn(
                    'home-scope rounded-lg px-3 py-1.5 font-semibold text-sm',
                    reviewInbox.scope === scope && 'glass-control',
                  )}
                  onClick={() => reviewInbox.setScope(scope)}
                >
                  {scope === 'reviewer'
                    ? t('home.forMyReview')
                    : t('home.createdByMe')}
                </button>
              ))}
            </div>
            <BranchDiagram />
          </header>

          {reviewInbox.isLoading && (
            <p className="home-empty-state" role="status">
              {t('home.loadingMergeRequests')}
            </p>
          )}
          {reviewInbox.hasRequests && (
            <ul className="list-none px-2 py-2 sm:px-3">
              {reviewInbox.pages.map((page) => (
                <InboxPageRows
                  key={page.page}
                  rows={page.items}
                  onSelect={reviewInbox.openRequest}
                />
              ))}
            </ul>
          )}
          {reviewInbox.error ? (
            <StatusMessage className="mx-4 mb-4" error>
              {t('home.loadMergeRequestsFailed')}{' '}
              <button
                className="font-semibold underline"
                type="button"
                onClick={reviewInbox.retry}
              >
                {t('common.retry')}
              </button>
            </StatusMessage>
          ) : reviewInbox.query.hasNextPage ? (
            <div className="px-5 pb-5 text-center">
              <button
                type="button"
                className="glass-control inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium text-sm"
                disabled={reviewInbox.query.isFetching}
                onClick={reviewInbox.loadMore}
              >
                {reviewInbox.query.isFetchingNextPage
                  ? t('common.loading')
                  : t('home.showMore')}
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
          {!reviewInbox.isLoading &&
            !reviewInbox.error &&
            !reviewInbox.hasRequests && (
              <div className="home-empty-state" role="status">
                <CircleCheck
                  className="mx-auto mb-3 size-7 text-[var(--color-success-fg)]"
                  aria-hidden
                />
                {reviewInbox.scope === 'reviewer'
                  ? t('home.noMergeRequestsAreAssignedToYou')
                  : t('home.youHaveNoOpenMergeRequestsYet')}
              </div>
            )}
        </section>

        <section
          className="glass-panel min-w-0 rounded-2xl"
          aria-labelledby="home-projects-title"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-[var(--glass-border)] border-b px-4 py-4 sm:px-5">
            <h2
              id="home-projects-title"
              tabIndex={-1}
              className="flex scroll-mt-4 items-center gap-2.5 font-semibold text-lg tracking-tight"
            >
              <Folders className="size-5 text-fg-muted" aria-hidden />
              {t('home.projects')}
            </h2>
            <div className="relative min-w-0">
              <select
                aria-label={t('home.projectCategory')}
                className="glass-control max-w-full appearance-none rounded-lg py-2 pr-8 pl-3 font-medium text-xs"
                value={gitlabProjectsList.activeTab}
                onChange={(event) =>
                  model.setActiveTab(event.target.value as ProjectListTab)
                }
              >
                {model.tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                    {tab.count != null
                      ? ` · ${formatProjectCount(tab.count)}`
                      : ''}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2 text-fg-muted"
                aria-hidden
              />
            </div>
          </header>
          {model.showProjectsLoading && (
            <p className="home-empty-state" role="status">
              {t('home.loadingProjects')}
            </p>
          )}
          {model.showProjectsError && (
            <StatusMessage className="mx-4 mb-4" error>
              {gitlabProjectsList.errorMessage}
            </StatusMessage>
          )}
          {model.showProjectsEmpty && (
            <p className="home-empty-state">
              {t('home.noProjectsFor', { connection: model.connectionLabel })}
            </p>
          )}
          {model.showProjectsList && (
            <>
              <ul className="list-none px-2 py-1">
                {gitlabProjectsList.projects.map((project) => (
                  <li
                    key={project.data.id}
                    className="home-list-item flex min-w-0 items-center gap-1 px-1 py-1"
                  >
                    <button
                      className="home-project-row flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left"
                      type="button"
                      onClick={() => model.openProject(project)}
                    >
                      <ProjectAvatar
                        className="size-8 shrink-0 rounded-lg object-cover"
                        id={project.data.id}
                        avatarUrl={project.data.avatar_url}
                        name={project.name}
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-semibold text-sm">
                          {project.name}
                        </span>
                        <span
                          className="truncate text-fg-muted text-xs"
                          title={project.data.path_with_namespace}
                        >
                          {project.data.path_with_namespace}
                        </span>
                      </span>
                    </button>
                    <button
                      className="glass-control mr-1 inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 font-semibold text-xs"
                      type="button"
                      aria-label={t('home.mergeRequestsFor', {
                        v1: project.data.path_with_namespace,
                      })}
                      title={t('home.mergeRequestsFor', { v1: project.name })}
                      onClick={() => model.openProjectMergeRequests(project)}
                    >
                      <CodePullRequest className="size-3.5" aria-hidden />
                      MR
                    </button>
                  </li>
                ))}
              </ul>
              <LoadMoreSentinel
                disabled={!model.canLoadMoreProjects}
                onLoadMore={model.loadMoreProjects}
              />
            </>
          )}
          {model.showProjectsLoadingMore && (
            <p className="home-empty-state" role="status">
              {t('home.loadingMoreProjects')}
            </p>
          )}
        </section>
      </div>
    );
  },
  { id: 'home' },
);
