import { actionBound, computed } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import type { GitlabProjectInfo } from "@/entities/gitlab-projects/model/gitlab-project-info";
import { VM } from "@/shared/lib/view-models/vm";
import type { LayoutVM } from "@/widgets/layout/model/layout-vm";
import { GitlabProjectsList, type ProjectListTab } from "./gitlab-projects-list";
import { ReviewInbox } from "./review-inbox";

export class HomePageVM extends VM<{}, LayoutVM> {
  readonly gitlabProjectsList: GitlabProjectsList;
  readonly reviewInbox: ReviewInbox;

  constructor(globals: Globals, params: ViewModelParams<{}, LayoutVM>) {
    super(globals, params);
    this.gitlabProjectsList = new GitlabProjectsList({
      globals,
      abortSignal: this.unmountSignal,
    });
    this.reviewInbox = new ReviewInbox(globals, this.unmountSignal, this.gitlabProjectsList);
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

  @actionBound
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

  @actionBound
  loadMoreProjects() {
    this.gitlabProjectsList.loadMore();
  }

  @actionBound
  openProject(project: GitlabProjectInfo) {
    this.globals.stores.repository.setProject(project.data);
    void this.globals.routes.repository.open({
      projectId: String(project.data.id),
    });
  }

  @actionBound
  openProjectMergeRequests(project: GitlabProjectInfo) {
    this.globals.stores.repository.setProject(project.data);
    void this.globals.routes.mergeRequests.open({
      projectId: String(project.data.id),
    });
  }
}
