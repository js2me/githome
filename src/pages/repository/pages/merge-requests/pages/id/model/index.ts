import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { RepositoryVM } from "@/pages/repository/model";
import { MrInfoModel } from "./mr-info";

export class MergeRequestVM extends RepositoryVM {
  readonly mrInfo: MrInfoModel;

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);
    this.mrInfo = new MrInfoModel(this);
  }
}
