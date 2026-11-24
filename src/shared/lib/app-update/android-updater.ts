import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { AndroidUpdateAsset } from "./github-release";

interface AndroidUpdaterPlugin {
  getInfo(): Promise<{ version: string }>;
  download(asset: AndroidUpdateAsset): Promise<void>;
  install(): Promise<{ message?: string }>;
  addListener(
    event: "progress",
    listener: (event: { percent: number }) => void,
  ): Promise<PluginListenerHandle>;
}

export const androidUpdater = registerPlugin<AndroidUpdaterPlugin>("AppUpdater");
