import { QueryClient } from "mobx-tanstack-query";
import { Repository } from "@/entities/gitlab-repositories/model/repository";
import type { RouterParams } from "./router";
import { Router } from "./router";
import { SettingsStore } from "./stores/settings";
import { ViewModelsStore } from "./stores/view-models";

export interface GlobalsCreateParams {
  router?: RouterParams;
}

export class Globals {
  readonly router: Router;
  readonly stores: {
    settings: SettingsStore;
    repository: Repository;
    viewModels: ViewModelsStore;
    queryClient: QueryClient;
  };

  constructor(params: GlobalsCreateParams = {}) {
    this.router = new Router(params.router);
    const settings = new SettingsStore();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          staleTime: 30_000,
        },
      },
    });

    queryClient.mount();

    this.stores = {
      settings,
      repository: new Repository(settings),
      viewModels: new ViewModelsStore(this),
      queryClient,
    };
  }
}

export const globals = new Globals();
