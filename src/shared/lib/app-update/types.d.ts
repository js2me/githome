export type UpdateMessageKey =
  | 'updates.apkChecksumMismatch'
  | 'updates.apkIncompatible'
  | 'updates.apkMissing'
  | 'updates.apkSignatureMismatch'
  | 'updates.couldNotGetTheInstalledGithomeVersion'
  | 'updates.couldNotUpdateGithomeCheckYourConnection'
  | 'updates.desktopFetchFailed'
  | 'updates.desktopInstallFailed'
  | 'updates.desktopManualRelease'
  | 'updates.desktopPackagedOnly'
  | 'updates.downloadFailed'
  | 'updates.installIncomplete'
  | 'updates.installPermissionRequired'
  | 'updates.installerAlreadyOpen'
  | 'updates.installerOpenFailed'
  | 'updates.installersForTheNewVersionAreAvailable'
  | 'updates.invalidApk'
  | 'updates.thisReleaseDoesNotHaveAnApk';

export type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'current'
  | 'error'
  | 'manual';

export interface AppUpdateState {
  status: AppUpdateStatus;
  version: string;
  nextVersion?: string;
  progress?: number;
  messageKey?: UpdateMessageKey;
}

export interface AppUpdateApi {
  getState(): Promise<AppUpdateState>;
  check(): Promise<void>;
  download(): Promise<void>;
  install(): Promise<void>;
  subscribe(listener: (state: AppUpdateState) => void): () => void;
}
