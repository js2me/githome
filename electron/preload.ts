import { contextBridge, ipcRenderer } from "electron";
import type { AppUpdateState } from "../src/shared/lib/app-update/types";

contextBridge.exposeInMainWorld("githomeDesktop", {
  platform: process.platform,
  updates: {
    getState: () => ipcRenderer.invoke("app-update:get-state"),
    check: () => ipcRenderer.invoke("app-update:check"),
    install: () => ipcRenderer.invoke("app-update:install"),
    subscribe: (listener: (state: AppUpdateState) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, state: AppUpdateState) => listener(state);
      ipcRenderer.on("app-update:state", handler);
      return () => ipcRenderer.removeListener("app-update:state", handler);
    },
  },
});
