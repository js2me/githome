import {
  type AnyViewModel,
  type AnyViewModelSimple,
  isViewModelSimpleClass,
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

    reaction(() => [...this.viewModels.entries()],(vms)=>{
      console.log(">>>>>>>>> vms!!!!!!: ", ...vms.filter(it => !it[0].includes('GitlabAvatarVM')).flat());
    })
  }

  create<VMType extends AnyViewModel | AnyViewModelSimple>(
    config: ViewModelCreateConfig<VMType>,
  ): VMType {
    const vmConfig = mergeVMConfigs(this.vmConfig, config.vmConfig);
    const vmParams = { ...config, vmConfig };
    const customVM = config.factory?.(config);

    if (customVM !== undefined) {
      return customVM as VMType;
    }

    if (isViewModelSimpleClass(config.VM)) {
      return vmConfig.factory(vmParams) as VMType;
    }

    const VMClass = config.VM as unknown as Class<
      VM,
      ConstructorParameters<typeof VM>
    >;

    const vm = new VMClass(this.globals, {
      ...config,
      vmConfig,
    });

    return vm as unknown as VMType;
  }
}
