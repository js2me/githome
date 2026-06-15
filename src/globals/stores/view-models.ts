import {
  type AnyViewModel,
  mergeVMConfigs,
  type ViewModelCreateConfig,
  ViewModelStoreBase,
} from "mobx-view-model";
import type { VM } from "@/shared/lib/view-models/vm";
import type { Globals } from "..";

export class ViewModelsStore extends ViewModelStoreBase {
  constructor(private globals: Globals) {
    super({
      vmConfig: {
        useReactIds: true,
        observable: {
          viewModels: {
            useDecorators: false,
          },
          viewModelStores: {
            useDecorators: false,
          },
        },
      },
    });
  }

  createViewModel<VMType extends AnyViewModel>(
    config: ViewModelCreateConfig<VMType>,
  ): VMType {
    const VMClass = config.VM as unknown as Class<
      VM,
      ConstructorParameters<typeof VM>
    >;

    const vm = new VMClass(this.globals, {
      ...config,
      vmConfig: mergeVMConfigs(this.vmConfig, config.vmConfig),
    });

    return vm as unknown as VMType;
  }
}
