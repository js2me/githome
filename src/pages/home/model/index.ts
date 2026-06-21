import { action, computed } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import type { GitlabProjectInfo } from "@/entities/gitlab-projects/model/gitlab-project-info";
import {
  GitlabProjectsList,
  type ProjectListTab,
} from "./gitlab-projects-list";
import { VM } from "@/shared/lib/view-models/vm";

export class HomeVM extends VM {
  readonly gitlabProjectsList: GitlabProjectsList;

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);
    this.gitlabProjectsList = new GitlabProjectsList({
      globals,
      abortSignal: this.unmountSignal,
    });
  }

  @computed
  get connectionLabel() {
    return this.globals.stores.settings.activeItem?.gitlabUrl.trim() ?? "";
  }

  @computed
  get isConfigured() {
    return this.globals.stores.settings.isConfigured;
  }

  @computed
  get tabs() {
    return this.gitlabProjectsList.tabs;
  }

  @computed
  get showConfigurePrompt() {
    return !this.isConfigured;
  }

  @computed
  get showProjectsLoading() {
    return this.isConfigured && this.gitlabProjectsList.isInitialLoading;
  }

  @computed
  get showProjectsError() {
    return (
      this.isConfigured &&
      Boolean(this.gitlabProjectsList.errorMessage) &&
      !this.gitlabProjectsList.isInitialLoading
    );
  }

  @computed
  get showProjectsEmpty() {
    return (
      this.isConfigured &&
      !this.gitlabProjectsList.isInitialLoading &&
      !this.gitlabProjectsList.errorMessage &&
      this.gitlabProjectsList.projects.length === 0
    );
  }

  @computed
  get showProjectsList() {
    return this.gitlabProjectsList.projects.length > 0;
  }

  @action.bound
  setActiveTab(tab: ProjectListTab) {
    this.gitlabProjectsList.setActiveTab(tab);
  }

  @computed
  get canLoadMoreProjects() {
    return this.gitlabProjectsList.canLoadMore;
  }

  @computed
  get showProjectsLoadingMore() {
    return this.gitlabProjectsList.isFetchingNextPage;
  }

  @action.bound
  loadMoreProjects() {
    this.gitlabProjectsList.loadMore();
  }

  @action.bound
  openProject(project: GitlabProjectInfo) {
    this.globals.stores.repository.setProject(project.data);
    void this.globals.router.routes.repository.open({
      projectId: String(project.data.id),
    });
  }
}
