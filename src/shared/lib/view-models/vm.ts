import {
  type AnyViewModel,
  type AnyViewModelSimple,
  ViewModelBase,
  type ViewModelParams,
} from "mobx-view-model";
import type { Globals } from "@/globals";
import { VMStore } from "./vm-store";

export class VM<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
  ComponentProps extends AnyObject = AnyObject,
> extends ViewModelBase<Payload, ParentViewModel, ComponentProps> {
  abortSignal = this.unmountSignal;

  protected override get viewModels(): VMStore {
    return this.globals.stores.viewModels;
  }

  constructor(
    public globals: Globals,
    params: ViewModelParams<Payload, ParentViewModel, ComponentProps>,
  ) {
    super(params);
  }
}
