export interface SystemLinksState {
  available: boolean;
  enabled: boolean;
}

export interface SystemLinksApi {
  getState: () => Promise<SystemLinksState>;
  setEnabled: (enabled: boolean) => Promise<SystemLinksState>;
  syncGitlabs: (urls: string[]) => Promise<void>;
  takePending: () => Promise<string[]>;
  subscribe: (listener: () => void) => () => void;
}
