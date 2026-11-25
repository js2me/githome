import { computed, observableRef } from "mobx";
import { MrList } from "@/entities/gitlab-merge-requests/model/mr-list";
import type { RepositoryPageVM } from "@/pages/repository/model/page-vm";
import { VM } from "@/shared/lib/view-models/vm";

export class MergeRequestsPageVM extends VM<{}, RepositoryPageVM> {
  @observableRef accessor mrList: MrList | null = null;

  @computed
  get projectId() {
    return this.parentViewModel.projectId;
  }

  @computed
  get selectedProject() {
    return this.parentViewModel.selectedProject;
  }

  @computed
  get mergeRequestIid() {
    return this.parentViewModel.mergeRequestIid;
  }

  protected willMount() {
    this.mrList = new MrList(this);
  }
}
