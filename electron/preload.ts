import { contextBridge, ipcRenderer } from "electron";
import type { AppUpdateState } from "../src/shared/lib/app-update/types";

contextBridge.exposeInMainWorld("githomeDesktop", {
  platform: process.platform,
  systemLinks: {
    getState: () => ipcRenderer.invoke("system-links:state"),
    setEnabled: (enabled: boolean) => ipcRenderer.invoke("system-links:enable", enabled),
    syncGitlabs: (urls: string[]) => ipcRenderer.invoke("system-links:sync", urls),
    takePending: () => ipcRenderer.invoke("system-links:take"),
    subscribe: (listener: () => void) => {
      const handler = () => listener();
      ipcRenderer.on("system-links:pending", handler);
      return () => ipcRenderer.removeListener("system-links:pending", handler);
    },
  },
  updates: {
    getState: () => ipcRenderer.invoke("app-update:get-state"),
    check: () => ipcRenderer.invoke("app-update:check"),
    download: () => ipcRenderer.invoke("app-update:download"),
    install: () => ipcRenderer.invoke("app-update:install"),
    subscribe: (listener: (state: AppUpdateState) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, state: AppUpdateState) => listener(state);
      ipcRenderer.on("app-update:state", handler);
      return () => ipcRenderer.removeListener("app-update:state", handler);
    },
  },
});
