/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ELECTRON: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GithomeDesktopApi {
  platform: NodeJS.Platform;
  updates: import("./shared/lib/app-update/types").AppUpdateApi;
}

interface Window {
  githomeDesktop?: GithomeDesktopApi;
}
