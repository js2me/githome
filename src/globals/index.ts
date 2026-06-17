import { QueryClient } from "mobx-tanstack-query";
import { Repository } from "@/entities/gitlab-repositories/model/repository";
import { Router } from "./router";
import { SettingsStore } from "./stores/settings";
import { ViewModelsStore } from "./stores/view-models";

export class Globals {
  readonly router: Router;
  readonly stores: {
    settings: SettingsStore;
    repository: Repository;
    viewModels: ViewModelsStore;
    queryClient: QueryClient;
  };

  constructor() {
    this.router = new Router();
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
