import {
  type AnyViewModel,
  type AnyViewModelSimple,
  ViewModelBase,
  type ViewModelParams,
} from 'mobx-view-model';
import type { Globals } from '@/shared/model/globals';

export class VM<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
  ComponentProps extends AnyObject = AnyObject,
  Services extends Globals = Globals,
> extends ViewModelBase<Payload, ParentViewModel, ComponentProps> {
  abortSignal = this.unmountSignal;

  protected override get viewModels() {
    return this.globals.stores.viewModels;
  }

  constructor(
    public readonly globals: Services,
    params: ViewModelParams<Payload, ParentViewModel, ComponentProps>,
  ) {
    super(params);
  }
}
