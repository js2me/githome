import { action, computed, observable } from "mobx";
import type { Globals } from "@/globals";
import { GitlabProjectInfo } from "@/entities/gitlab-projects/model/gitlab-project-info";
import type { GitLabProjectDC, GitLabUserDC } from "@/shared/api/gitlab";
import {
  createGitlabListQuery,
  createGitlabQuery,
  createInfiniteGitlabQuery,
} from "@/shared/lib/gitlab/create-query";
import {
  buildProjectListParams,
  PROJECT_LIST_TAB_LABELS,
  PROJECT_LIST_TABS,
  PROJECTS_PER_PAGE,
  type ProjectListTab,
} from "./project-list-tab";

export interface GitlabProjectsListParams {
  globals: Globals;
  abortSignal: AbortSignal;
}

export class GitlabProjectsList {
  @observable accessor activeTab: ProjectListTab = "contributed";

  readonly currentUserQuery;
  readonly projectsQuery;
  private readonly countQueries: Record<
    ProjectListTab,
    ReturnType<typeof createGitlabListQuery<GitLabProjectDC>>
  >;

  constructor(params: GitlabProjectsListParams) {
    this.currentUserQuery = createGitlabQuery<number>({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => ({ path: "/user" }),
      select: (data) => (data as GitLabUserDC).id,
    });

    this.countQueries = Object.fromEntries(
      PROJECT_LIST_TABS.map((tab) => [
        tab,
        createGitlabListQuery<GitLabProjectDC>({
          globals: params.globals,
          abortSignal: params.abortSignal,
          params: () =>
            buildProjectListParams({
              tab,
              perPage: 1,
              userId: this.currentUserQuery.data,
            }),
        }),
      ]),
    ) as GitlabProjectsList["countQueries"];

    this.projectsQuery = createInfiniteGitlabQuery<GitLabProjectDC>({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () =>
        buildProjectListParams({
          tab: this.activeTab,
          perPage: PROJECTS_PER_PAGE,
          userId: this.currentUserQuery.data,
        }),
    });
  }

  @computed
  get tabs() {
    return PROJECT_LIST_TABS.map((id) => ({
      id,
      label: PROJECT_LIST_TAB_LABELS[id],
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
    return (
      this.currentUserQuery.isLoading ||
      this.projectsQuery.isLoading
    );
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

    return error instanceof Error ? error.message : "Не удалось загрузить проекты";
  }

  @computed
  get canLoadMore() {
    return (
      this.hasNextPage &&
      !this.isInitialLoading &&
      !this.isFetchingNextPage
    );
  }

  @action.bound
  setActiveTab(tab: ProjectListTab) {
    this.activeTab = tab;
  }

  @action.bound
  loadMore() {
    if (!this.canLoadMore) {
      return;
    }

    void this.projectsQuery.fetchNextPage();
  }
}

export type { ProjectListTab };
