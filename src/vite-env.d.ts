/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ELECTRON: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GithomeDesktopApi {
  platform: NodeJS.Platform;
}

interface Window {
  githomeDesktop?: GithomeDesktopApi;
}
