import { InferViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { MrList } from "@/entities/gitlab-merge-requests/model/mr-list";
import { RepositoryPageVM } from "@/pages/repository/model";
import { VM } from "@/shared/lib/view-models/vm";
import { computed } from "mobx";

export class MergeRequestsPageVM extends VM<{}, RepositoryPageVM> {
  mrList;

  @computed
  get projectId() {
    return this.parentViewModel.projectId;
  }

  @computed
  get selectedProject() {
    return this.parentViewModel.selectedProject
  }

  @computed
  get mergeRequestIid() {
    return this.parentViewModel.mergeRequestIid;
  }

  constructor(globals: Globals, params: InferViewModelParams<MergeRequestsPageVM>) {
    super(globals, params);

    this.mrList = new MrList(this);
  }
}
