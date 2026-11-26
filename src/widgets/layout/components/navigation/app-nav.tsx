import { observer } from 'mobx-react-lite';
import { useViewModel } from 'mobx-view-model-react';
import logo from '../../../../../resources/icons/128x128.png';
import type { LayoutVM } from '../../model/layout-vm';
import { ConnectionPicker } from '../connection-picker';
import { OpenMergeRequestDialog } from '../open-merge-request-dialog';
import { SettingsDialog } from '../settings-dialog';
import { AppBreadcrumbs } from './app-breadcrumbs';

export const AppNav = observer(() => {
  const model = useViewModel<LayoutVM>();
  return (
    <header className="glass-bar relative z-40 border-b px-3 sm:px-5 lg:px-7">
      <div className="flex min-h-16 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 py-2.5 sm:gap-x-4">
        <button
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg"
          type="button"
          aria-label="GitHome — на главную"
          onClick={model.openHome}
        >
          <img src={logo} alt="" className="size-7 sm:size-8" />
          <span className="font-bold text-lg tracking-tight sm:text-xl">
            GitHome
          </span>
        </button>
        <AppBreadcrumbs />
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          {model.globals.stores.settings.connections.length > 0 && (
            <OpenMergeRequestDialog />
          )}
          <ConnectionPicker />
          <SettingsDialog />
        </div>
      </div>
    </header>
  );
});
