import { action, computed } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import type { GitlabProjectInfo } from "@/entities/gitlab-projects/model/gitlab-project-info";
import { GitlabProjectsList } from "@/entities/gitlab-projects/model/gitlab-projects-list";
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
  get showConfigurePrompt() {
    return !this.isConfigured;
  }

  @computed
  get showProjectsLoading() {
    return this.isConfigured && this.gitlabProjectsList.isLoading;
  }

  @computed
  get showProjectsError() {
    return (
      this.isConfigured &&
      Boolean(this.gitlabProjectsList.errorMessage) &&
      !this.gitlabProjectsList.isLoading
    );
  }

  @computed
  get showProjectsEmpty() {
    return (
      this.isConfigured &&
      !this.gitlabProjectsList.isLoading &&
      !this.gitlabProjectsList.errorMessage &&
      this.gitlabProjectsList.projects.length === 0
    );
  }

  @computed
  get showProjectsList() {
    return this.gitlabProjectsList.projects.length > 0;
  }

  @action.bound
  openProject(project: GitlabProjectInfo) {
    this.globals.stores.repository.setProject(project.data);
    void this.globals.router.routes.repository.open({
      projectId: String(project.data.id),
    });
  }
}
