import {
  type AnyViewModel,
  mergeVMConfigs,
  type ViewModelCreateConfig,
  ViewModelStoreBase,
} from "mobx-view-model";
import type { VM } from "@/shared/lib/view-models/vm";
import type { Globals } from "../../../globals";
import { reaction } from "mobx";

export class VMStore extends ViewModelStoreBase {
  constructor(private globals: Globals) {
    super({
      vmConfig: {
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

    reaction(() => [...this.viewModels.values()].filter(it => it.constructor.name === 'RepositoryPageVM').length,(count)=>{
      console.log(">>>>>>>>> RepositoryPageVM COUNT: ", count);
    })
  }

  create<VMType extends AnyViewModel>(
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
