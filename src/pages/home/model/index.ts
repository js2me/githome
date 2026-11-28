import { actionBound, computed, observable } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import type { GitlabProjectInfo } from '@/entities/gitlab-projects';
import { ReviewInbox } from '@/features/review-inbox';
import {
  isMergeRequestNavItem,
  type MergeRequestNavItem,
  type Workspace,
  WorkspaceVM,
} from '@/features/workspace-navigation';
import type { LayoutVM } from '@/widgets/layout';
import {
  GitlabProjectsList,
  type ProjectListTab,
} from './gitlab-projects-list';
import { InboxCommandModel } from './inbox-command';

export class HomePageVM extends WorkspaceVM<{}, LayoutVM> {
  readonly gitlabProjectsList: GitlabProjectsList;
  readonly reviewInbox: ReviewInbox;
  readonly command: InboxCommandModel;
  @observable accessor projectFilter = '';

  constructor(globals: Workspace, params: ViewModelParams<{}, LayoutVM>) {
    super(globals, params);
    this.gitlabProjectsList = new GitlabProjectsList({
      globals,
      abortSignal: this.unmountSignal,
    });
    this.reviewInbox = new ReviewInbox(
      globals,
      this.unmountSignal,
      'reviewer',
      (projectId) =>
        this.gitlabProjectsList.projects.find(
          ({ data }) => data.id === projectId,
        )?.data.path_with_namespace,
    );
    this.command = new InboxCommandModel(
      globals,
      this.reviewInbox,
      this.unmountSignal,
    );
  }

  @computed
  get recentMergeRequests() {
    const connectionId = this.globals.stores.settings.activeId;
    return this.globals.stores.navTree.items
      .filter(isMergeRequestNavItem)
      .filter((item) => item.payload?.connectionId === connectionId)
      .sort(
        (a, b) => (b.payload.lastOpenedAt ?? 0) - (a.payload.lastOpenedAt ?? 0),
      )
      .slice(0, 5);
  }

  @actionBound
  openRecentRequest(item: MergeRequestNavItem) {
    this.globals.navigation.mergeRequests.select(item);
  }

  @actionBound
  setProjectFilter(filter: string) {
    this.projectFilter = filter;
  }

  @computed
  get visibleProjects() {
    const query = this.projectFilter.trim().toLowerCase();
    return this.gitlabProjectsList.projects.filter(
      ({ name, data }) =>
        !query ||
        name.toLowerCase().includes(query) ||
        data.path_with_namespace.toLowerCase().includes(query),
    );
  }

  @computed
  get connectionLabel() {
    return (
      this.globals.stores.settings.activeConnection?.gitlabUrl.trim() ?? ''
    );
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

  @actionBound
  openProjectPipelines(project: GitlabProjectInfo) {
    this.globals.stores.repository.setProject(project.data);
    void this.globals.routes.pipelines.open({
      projectId: String(project.data.id),
    });
  }
}
