import { QueryClient } from "mobx-tanstack-query";
import { Repository } from "@/entities/gitlab-repositories/model/repository";
import { Router } from "./router";
import { SettingsStore } from "./stores/settings";
import { VMStore } from "../shared/lib/view-models/vm-store";

export class Globals {
  readonly router: Router;
  readonly stores: {
    settings: SettingsStore;
    repository: Repository;
    viewModels: VMStore;
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
      viewModels: new VMStore(this),
      queryClient,
    };
  }
}
