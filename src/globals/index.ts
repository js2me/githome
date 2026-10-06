import { QueryClient } from "mobx-tanstack-query";
import { Repository } from "@/entities/gitlab-repositories/model/repository";
import { MergeRequestNavAdapter } from "@/features/merge-requests/model/merge-request-nav";
import { Router } from "./router";
import { SettingsStore } from "./stores/settings";
import { NavTreeStore } from "./stores/nav-tree";
import { ThemeManager } from "./stores/theme-manager";
import { VMStore } from "../shared/lib/view-models/vm-store";

export class Globals extends Router {
  readonly stores: {
    settings: SettingsStore;
    navTree: NavTreeStore;
    repository: Repository;
    viewModels: VMStore;
    queryClient: QueryClient;
    theme: ThemeManager;
  };
  readonly navigation: {
    mergeRequests: MergeRequestNavAdapter;
  };

  constructor() {
    super();
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
      navTree: new NavTreeStore(),
      repository: new Repository(settings),
      viewModels: new VMStore(this),
      queryClient,
      theme: new ThemeManager(),
    };

    this.navigation = {
      mergeRequests: new MergeRequestNavAdapter(this),
    };
    this.navigation.mergeRequests.start();
  }
}
