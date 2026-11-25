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
  message?: string;
}

export interface AppUpdateApi {
  getState(): Promise<AppUpdateState>;
  check(): Promise<void>;
  download(): Promise<void>;
  install(): Promise<void>;
  subscribe(listener: (state: AppUpdateState) => void): () => void;
}
