import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("githomeDesktop", {
  platform: process.platform,
});
