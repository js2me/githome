import {
  type AnyViewModel,
  type AnyViewModelSimple,
  ViewModelBase,
  type ViewModelParams,
} from "mobx-view-model";
import type { Globals } from "@/globals";
import type { ViewModelsStore } from "@/globals/stores/view-models";

export class VM<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
  ComponentProps extends AnyObject = AnyObject,
> extends ViewModelBase<Payload, ParentViewModel, ComponentProps> {
  protected override get viewModels(): ViewModelsStore {
    return this.globals.stores.viewModels;
  }

  constructor(
    public globals: Globals,
    params: ViewModelParams<Payload, ParentViewModel, ComponentProps>,
  ) {
    super(params);
  }
}
