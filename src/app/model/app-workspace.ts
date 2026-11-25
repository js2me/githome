import { Repository } from '@/entities/gitlab-repositories';
import type { Workspace } from '@/features/workspace-navigation';
import { MergeRequestNavAdapter } from '@/features/workspace-navigation';
import { SettingsStore } from '@/shared/lib/gitlab/settings';
import { NavTreeStore } from '@/shared/lib/navigation/nav-tree';
import { Router } from '@/shared/lib/navigation/router';
import { ThemeManager } from '@/shared/lib/theme-manager';
import { VMStore } from './vm-store';

export class AppWorkspace extends Router implements Workspace {
  readonly stores: {
    settings: SettingsStore;
    navTree: NavTreeStore;
    repository: Repository;
    viewModels: VMStore;
    theme: ThemeManager;
  };
  readonly navigation: {
    mergeRequests: MergeRequestNavAdapter;
  };

  constructor() {
    super();
    const settings = new SettingsStore();
    this.stores = {
      settings,
      navTree: new NavTreeStore(),
      repository: new Repository(settings),
      viewModels: new VMStore(this),
      theme: new ThemeManager(),
    };

    this.navigation = {
      mergeRequests: new MergeRequestNavAdapter(this),
    };
    this.navigation.mergeRequests.start();
  }
}
