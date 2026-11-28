import { observer } from 'mobx-react-lite';
import { useViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import logo from '../../../../../resources/icons/128x128.png';
import type { LayoutVM } from '../../model/layout-vm';
import { ConnectionPicker } from '../connection-picker';
import { SettingsDialog } from '../settings-dialog';
import { CommandPalette } from './command-palette';

export const AppNav = observer(() => {
  const model = useViewModel<LayoutVM>();
  return (
    <header className="workbench-header">
      <div className="workbench-toolbar">
        <button
          className="workbench-brand"
          type="button"
          aria-label={t('navigation.githomeHome')}
          onClick={model.openHome}
        >
          <img src={logo} alt="" className="size-6" />
          <span className="font-semibold tracking-tight">GitHome</span>
        </button>
        <CommandPalette />
        <div className="workbench-tools">
          <ConnectionPicker />
          <SettingsDialog />
        </div>
      </div>
    </header>
  );
});
