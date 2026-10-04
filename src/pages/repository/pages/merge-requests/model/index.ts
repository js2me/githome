import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { MrList } from "@/entities/gitlab-merge-requests/model/mr-list";
import { RepositoryPageVM } from "@/pages/repository/model/page-vm";
import { VM } from "@/shared/lib/view-models/vm";
import { computed } from "mobx";
import { MaybePromise } from "yummies/types";

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

  protected willMount(): MaybePromise<void> {
    console.log("KEK MergeRequestsPageVM willMount");
  }

  constructor(globals: Globals, params: ViewModelParams<{}, RepositoryPageVM>) {
    super(globals, params);

    console.log("KEK MergeRequestsPageVM create");

    this.mrList = new MrList(this);
  }
}
