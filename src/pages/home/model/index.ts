import { makeObservable } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { GitlabProjectInfoModel } from "@/entities/gitlab-projects/model/gitlab-project-info";
import { VM } from "@/shared/lib/view-models/vm";

export class HomeVM extends VM {
  readonly gitlabProjectInfo: GitlabProjectInfoModel;

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);
    this.gitlabProjectInfo = new GitlabProjectInfoModel({ globals });
    makeObservable(this, {});
  }
}
