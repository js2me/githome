import type { ViewModelStore } from 'mobx-view-model';
import type { SettingsStore } from '@/shared/lib/gitlab/settings';
import type { ThemeManager } from '@/shared/lib/theme-manager';

export interface Globals {
  readonly stores: {
    readonly settings: SettingsStore;
    readonly theme: ThemeManager;
    readonly viewModels: ViewModelStore;
  };
}
