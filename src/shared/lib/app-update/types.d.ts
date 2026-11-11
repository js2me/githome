export type AppUpdateStatus = "idle" | "checking" | "downloading" | "ready" | "current" | "error" | "manual";

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
  install(): Promise<void>;
  subscribe(listener: (state: AppUpdateState) => void): () => void;
}
