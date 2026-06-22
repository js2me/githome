import { InferViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { RepositoryPageVM } from "@/pages/repository/model";
import { VM } from "@/shared/lib/view-models/vm";
import { MrInfoModel } from "./mr-info";

export class MergeRequestPageVM extends VM<{}, RepositoryPageVM> {
  mrInfo;

  get projectId() {
    return this.parentViewModel.projectId;
  }

  get selectedProject() {
    return this.parentViewModel.selectedProject;
  }

  get mergeRequestIid() {
    return this.parentViewModel.mergeRequestIid;
  }

  get project() {
    return this.parentViewModel.project;
  }

  constructor(globals: Globals, params: InferViewModelParams<MergeRequestPageVM>) {
    super(globals, params);

    this.mrInfo = new MrInfoModel({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const project = this.selectedProject;
        const mergeRequestIid = this.mergeRequestIid;

        if (!project || mergeRequestIid === null) {
          return false;
        }

        return { project, mergeRequestIid };
      },
    });
  }
}
