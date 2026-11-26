import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { AppSettings } from '../../model/app-settings';

export const SystemLinksSetting = observer(
  ({ model }: { model: AppSettings }) => {
    const { enabled = false, available = false } = model.systemLinks ?? {};
    if (!available && !model.systemLinksError) return null;

    return (
      <section className="glass-panel mt-6 rounded-xl px-4 py-3">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block font-semibold text-sm">
              {t('settings.systemLinks')}
            </span>
            <span className="mt-1 block text-fg-muted text-sm">
              {t('settings.systemLinksDescription')}
            </span>
          </span>
          <input
            type="checkbox"
            className="size-4 shrink-0 accent-brand"
            checked={enabled}
            disabled={
              !available ||
              model.systemLinksBusy ||
              (!enabled && !model.hasGitlabConnections)
            }
            onChange={() => void model.toggleSystemLinks()}
          />
        </label>
        {!enabled && !model.hasGitlabConnections && (
          <p className="mt-2 text-fg-muted text-sm">
            {t('settings.systemLinksNoGitlab')}
          </p>
        )}
        {model.systemLinksError && (
          <p
            role="alert"
            className="mt-2 text-red-700 text-sm dark:text-red-300"
          >
            {t('settings.systemLinksError')}
          </p>
        )}
      </section>
    );
  },
);
