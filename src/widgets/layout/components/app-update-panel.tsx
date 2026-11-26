import { ArrowUpRightFromSquare } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { releasesUrl } from '@/shared/lib/app-update/github-release';
import type { AppUpdateStatus } from '@/shared/lib/app-update/types';
import { type MessageKey, t } from '@/shared/lib/i18n';
import type { AppUpdates } from '../model/app-updates';

const updateActions: Partial<Record<AppUpdateStatus, MessageKey>> = {
  checking: 'updates.checking',
  available: 'updates.downloadUpdate',
  downloading: 'updates.downloading',
  ready: 'updates.installAndRestart',
  installing: 'updates.installing',
};

export const AppUpdatePanel = observer(({ model }: { model: AppUpdates }) => {
  const { status, version, nextVersion, progress, messageKey } = model.state;
  const statusText = messageKey
    ? t(messageKey)
    : {
        idle: t('updates.checkWhetherANewerVersionOfGithome'),
        checking: t('updates.checkingGithubReleases'),
        available: t('updates.theUpdateIsReadyToDownload'),
        downloading: t('updates.downloadingUpdate', { v1: progress ?? 0 }),
        ready: t('updates.theUpdateIsDownloadedAndReadyTo'),
        installing: t('updates.finishingTheInstallation'),
        current: t('updates.youHaveTheLatestVersion'),
        manual: '',
        error: '',
      }[status];

  return (
    <section aria-labelledby="settings-updates">
      <h3 id="settings-updates" className="font-semibold text-lg">
        {t('updates.githomeUpdates')}
      </h3>
      <p className="mt-1 mb-5 text-fg-muted text-sm">
        {t('updates.latestStableVersionFromGithubReleases')}
      </p>

      <div className="glass-panel rounded-xl p-4 sm:p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-fg-muted">{t('updates.installedVersion')}</dt>
            <dd className="mt-1 font-mono font-semibold">{version}</dd>
          </div>
          {nextVersion && (
            <div>
              <dt className="text-fg-muted">{t('updates.newVersion')}</dt>
              <dd className="mt-1 font-mono font-semibold">{nextVersion}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 border-border-default border-t pt-4">
          <p
            role="status"
            className={
              status === 'error'
                ? 'text-red-700 text-sm dark:text-red-300'
                : 'text-fg-muted text-sm'
            }
          >
            {statusText}
          </p>

          {status === 'downloading' && (
            <progress
              aria-label={t('updates.updateDownloadProgress')}
              className="mt-3 h-2 w-full accent-brand"
              max={100}
              value={progress ?? 0}
            />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <button
              type="button"
              disabled={model.isBusy}
              onClick={() => void model.perform()}
              className="glass-primary rounded-lg px-3.5 py-2 font-semibold text-sm"
            >
              {model.isAndroid && status === 'ready'
                ? t('updates.installUpdate')
                : t(updateActions[status] ?? 'updates.checkForUpdates')}
            </button>
            <a
              href={releasesUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-fg-link text-sm hover:underline"
            >
              {t('updates.githubReleases')}
              <ArrowUpRightFromSquare className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
});
