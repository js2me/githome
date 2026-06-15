import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { RepositoryVM } from "@/pages/repository/model";
import { MrListModel } from "./mr-list";

export class MergeRequestsVM extends RepositoryVM {
  readonly mrList: MrListModel;

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);
    this.mrList = new MrListModel(this);
  }
}
