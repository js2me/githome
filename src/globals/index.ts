import type { RouterParams } from "./router";
import { Router } from "./router";
import { queryClient } from "./stores/query-client";
import { SettingsStore } from "./stores/settings";
import { ViewModelsStore } from "./stores/view-models";

export interface GlobalsCreateParams {
  router?: RouterParams;
}

export class Globals {
  readonly router: Router;
  readonly stores: {
    settings: SettingsStore;
    viewModels: ViewModelsStore;
    queryClient: typeof queryClient;
  };

  constructor(params: GlobalsCreateParams = {}) {
    this.router = new Router(params.router);
    this.stores = {
      settings: new SettingsStore(),
      viewModels: new ViewModelsStore(this),
      queryClient,
    };
  }
}

export const globals = new Globals();
