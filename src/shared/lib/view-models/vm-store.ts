import {
  type AnyViewModel,
  mergeVMConfigs,
  type ViewModelCreateConfig,
  ViewModelStoreBase,
} from "mobx-view-model";
import type { VM } from "@/shared/lib/view-models/vm";
import type { Globals } from "../../../globals";

export class VMStore extends ViewModelStoreBase {
  constructor(private globals: Globals) {
    super({
      vmConfig: {
        useReactIds: true,
        observable: {
          viewModels: {
            useDecorators: true,
          },
          viewModelStores: {
            useDecorators: true,
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
