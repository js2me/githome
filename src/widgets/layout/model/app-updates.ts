import { Capacitor } from '@capacitor/core';
import {
  actionBound,
  computed,
  observable,
  observableRef,
  runInAction,
} from 'mobx';
import { androidUpdater } from '@/shared/lib/app-update/android-updater';
import {
  type AndroidUpdateAsset,
  getAndroidUpdateAsset,
  getLatestRelease,
  isNewerRelease,
} from '@/shared/lib/app-update/github-release';
import type {
  AppUpdateState,
  UpdateMessageKey,
} from '@/shared/lib/app-update/types';

const androidMessages: Readonly<Record<string, UpdateMessageKey>> = {
  INVALID_APK: 'updates.invalidApk',
  DOWNLOAD_FAILED: 'updates.downloadFailed',
  APK_CHECKSUM_MISMATCH: 'updates.apkChecksumMismatch',
  APK_INCOMPATIBLE: 'updates.apkIncompatible',
  APK_SIGNATURE_MISMATCH: 'updates.apkSignatureMismatch',
  INSTALLER_ALREADY_OPEN: 'updates.installerAlreadyOpen',
  APK_MISSING: 'updates.apkMissing',
  INSTALLER_OPEN_FAILED: 'updates.installerOpenFailed',
  INSTALL_PERMISSION_REQUIRED: 'updates.installPermissionRequired',
  INSTALL_INCOMPLETE: 'updates.installIncomplete',
};

export class AppUpdates {
  @observableRef accessor state: AppUpdateState = {
    status: 'idle',
    version: import.meta.env.VITE_APP_VERSION,
  };
  @observable accessor isInitializing = true;
  @observable accessor isInvoking = false;

  readonly isAndroid =
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  private readonly desktop = window.githomeDesktop?.updates;
  private asset?: AndroidUpdateAsset;

  @computed
  get isBusy() {
    return (
      this.isInitializing ||
      this.isInvoking ||
      ['checking', 'downloading', 'installing'].includes(this.state.status)
    );
  }

  @actionBound
  async connect(signal: AbortSignal) {
    let receivedEvent = false;
    const unsubscribe = this.desktop?.subscribe((state) => {
      receivedEvent = true;
      this.setState(state);
    });
    if (unsubscribe)
      signal.addEventListener('abort', unsubscribe, { once: true });

    try {
      const state = this.desktop
        ? await this.desktop.getState()
        : this.isAndroid
          ? { status: 'idle' as const, ...(await androidUpdater.getInfo()) }
          : this.state;

      if (!signal.aborted && !receivedEvent) this.setState(state);
    } catch {
      if (!signal.aborted && !receivedEvent) {
        this.setState({
          status: 'error',
          version: this.state.version,
          messageKey: 'updates.couldNotGetTheInstalledGithomeVersion',
        });
      }
    } finally {
      if (!signal.aborted)
        runInAction(() => {
          this.isInitializing = false;
        });
    }
  }

  @actionBound
  async perform() {
    if (this.isBusy) return;
    const { status, version, nextVersion } = this.state;
    this.isInvoking = true;

    try {
      if (this.desktop) {
        const command =
          status === 'ready'
            ? 'install'
            : status === 'available'
              ? 'download'
              : 'check';
        await this.desktop[command]();
        this.setState(await this.desktop.getState());
      } else if (this.isAndroid && status === 'ready') {
        this.setState({ status: 'installing', version, nextVersion });
        const { code } = await androidUpdater.install();
        this.setState({
          status: 'ready',
          version,
          nextVersion,
          messageKey: code ? androidMessages[code] : undefined,
        });
      } else if (this.isAndroid && status === 'available' && this.asset) {
        this.setState({
          status: 'downloading',
          version,
          nextVersion,
          progress: 0,
        });
        const listener = await androidUpdater.addListener(
          'progress',
          ({ percent }) => {
            this.setState({
              status: 'downloading',
              version,
              nextVersion,
              progress: percent,
            });
          },
        );
        try {
          await androidUpdater.download(this.asset);
          this.setState({ status: 'ready', version, nextVersion });
        } finally {
          void listener.remove().catch(console.error);
        }
      } else {
        await this.checkRelease(version);
      }
    } catch (error) {
      const code =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        typeof error.code === 'string'
          ? error.code
          : undefined;
      const apkMissing = code === 'APK_MISSING';
      const androidInstallFailed =
        this.isAndroid && status === 'ready' && !apkMissing;
      this.setState({
        status: androidInstallFailed ? 'ready' : 'error',
        version,
        nextVersion,
        messageKey:
          (this.isAndroid && code && Object.hasOwn(androidMessages, code)
            ? androidMessages[code]
            : undefined) ?? 'updates.couldNotUpdateGithomeCheckYourConnection',
      });
    } finally {
      runInAction(() => {
        this.isInvoking = false;
      });
    }
  }

  private async checkRelease(version: string) {
    this.asset = undefined;
    this.setState({ status: 'checking', version });
    const release = await getLatestRelease();
    if (!isNewerRelease(release.tag_name, version)) {
      this.setState({ status: 'current', version });
      return;
    }

    const latestVersion = release.tag_name.replace(/^v/, '');
    this.asset = this.isAndroid ? getAndroidUpdateAsset(release) : undefined;
    this.setState(
      this.asset
        ? { status: 'available', version, nextVersion: latestVersion }
        : {
            status: 'manual',
            version,
            nextVersion: latestVersion,
            messageKey: this.isAndroid
              ? 'updates.thisReleaseDoesNotHaveAnApk'
              : 'updates.installersForTheNewVersionAreAvailable',
          },
    );
  }

  @actionBound
  private setState(state: AppUpdateState) {
    this.state = state;
  }
}
