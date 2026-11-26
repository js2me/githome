import { actionBound, computed, observable } from 'mobx';
import { GitlabProjectInfo } from '@/entities/gitlab-projects';
import type { GitLabProjectDC } from '@/shared/api/gitlab';
import { createConnectionUserIdQuery } from '@/shared/lib/gitlab/connection/connection-profile-query';
import {
  createGitlabListQuery,
  createInfiniteGitlabQuery,
} from '@/shared/lib/gitlab/connection/create-query';
import { t } from '@/shared/lib/i18n';
import type { Globals } from '@/shared/model/globals';
import {
  buildProjectListParams,
  PROJECT_LIST_TABS,
  PROJECTS_PER_PAGE,
  type ProjectListTab,
} from './project-list-tab';

const PROJECT_LIST_QUERY_OPTIONS = {
  staleTime: 60 * 60 * 1000,
} as const;

export interface GitlabProjectsListParams {
  globals: Globals;
  abortSignal: AbortSignal;
}

export class GitlabProjectsList {
  @observable accessor activeTab: ProjectListTab = PROJECT_LIST_TABS[0].id;

  readonly currentUserQuery;
  readonly projectsQuery;
  private readonly countQueries: Record<
    ProjectListTab,
    ReturnType<typeof createGitlabListQuery<GitLabProjectDC>>
  >;

  constructor(params: GitlabProjectsListParams) {
    this.currentUserQuery = createConnectionUserIdQuery(
      () => params.globals.stores.settings.activeConnection,
      params.abortSignal,
    );

    this.countQueries = Object.fromEntries(
      PROJECT_LIST_TABS.map(({ id }) => [
        id,
        createGitlabListQuery<GitLabProjectDC>({
          globals: params.globals,
          abortSignal: params.abortSignal,
          params: () =>
            buildProjectListParams({
              tab: id,
              perPage: 1,
              userId: this.currentUserQuery.data,
            }),
          queryOptions: PROJECT_LIST_QUERY_OPTIONS,
        }),
      ]),
    ) as GitlabProjectsList['countQueries'];

    this.projectsQuery = createInfiniteGitlabQuery<GitLabProjectDC>({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () =>
        buildProjectListParams({
          tab: this.activeTab,
          perPage: PROJECTS_PER_PAGE,
          userId: this.currentUserQuery.data,
        }),
      queryOptions: PROJECT_LIST_QUERY_OPTIONS,
    });
  }

  @computed
  get tabs() {
    return PROJECT_LIST_TABS.map(({ id, labelKey }) => ({
      id,
      label: t(labelKey),
      count: this.countQueries[id].data?.total ?? null,
      isActive: this.activeTab === id,
    }));
  }

  @computed
  get projects(): GitlabProjectInfo[] {
    return (this.projectsQuery.data?.pages ?? [])
      .flatMap((page) => page.items)
      .map((data) => new GitlabProjectInfo(data));
  }

  @computed
  get hasNextPage() {
    return this.projectsQuery.hasNextPage;
  }

  @computed
  get isInitialLoading() {
    return this.currentUserQuery.isLoading || this.projectsQuery.isLoading;
  }

  @computed
  get isFetchingNextPage() {
    return this.projectsQuery.isFetchingNextPage;
  }

  @computed
  get isLoading() {
    return this.isInitialLoading || this.isFetchingNextPage;
  }

  @computed
  get errorMessage() {
    const error = this.projectsQuery.error ?? this.currentUserQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error
      ? error.message
      : t('home.couldNotLoadProjects');
  }

  @computed
  get canLoadMore() {
    return (
      this.hasNextPage && !this.isInitialLoading && !this.isFetchingNextPage
    );
  }

  @actionBound
  setActiveTab(tab: ProjectListTab) {
    this.activeTab = tab;
  }

  @actionBound
  loadMore() {
    if (!this.canLoadMore) {
      return;
    }

    void this.projectsQuery.fetchNextPage();
  }
}

export type { ProjectListTab };
