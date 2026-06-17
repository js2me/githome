import { computed } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { GitlabProjectInfoModel } from "@/entities/gitlab-projects/model/gitlab-project-info";
import { VM } from "@/shared/lib/view-models/vm";

export class HomeVM extends VM {
  readonly gitlabProjectInfo: GitlabProjectInfoModel;

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);
    this.gitlabProjectInfo = new GitlabProjectInfoModel({
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
    return this.isConfigured && this.gitlabProjectInfo.isLoading;
  }

  @computed
  get showProjectsError() {
    return (
      this.isConfigured &&
      Boolean(this.gitlabProjectInfo.errorMessage) &&
      !this.gitlabProjectInfo.isLoading
    );
  }

  @computed
  get showProjectsEmpty() {
    return (
      this.isConfigured &&
      !this.gitlabProjectInfo.isLoading &&
      !this.gitlabProjectInfo.errorMessage &&
      this.gitlabProjectInfo.projects.length === 0
    );
  }

  @computed
  get showProjectsList() {
    return this.gitlabProjectInfo.projects.length > 0;
  }
}
