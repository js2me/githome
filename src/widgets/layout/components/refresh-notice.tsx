import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { RefreshShortcut } from '../model/refresh-shortcut';

export const RefreshNotice = observer(
  ({ model }: { model: RefreshShortcut }) => (
    <div
      role="status"
      className="pointer-events-none fixed top-3 right-3 z-60 sm:right-4 lg:right-6"
    >
      {model.isVisible && (
        <div className="glass-overlay flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-medium text-fg-default text-sm">
          <span
            aria-hidden="true"
            className="size-4 rounded-full border-2 border-brand border-r-transparent motion-safe:animate-spin"
          />
          {t('navigation.refreshingData')}
        </div>
      )}
    </div>
  ),
);
