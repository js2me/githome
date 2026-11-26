import { type PluginListenerHandle, registerPlugin } from '@capacitor/core';
import type { AndroidUpdateAsset } from './github-release';

interface AndroidUpdaterPlugin {
  getInfo(): Promise<{ version: string }>;
  download(asset: AndroidUpdateAsset): Promise<void>;
  install(): Promise<{
    code?: 'INSTALL_PERMISSION_REQUIRED' | 'INSTALL_INCOMPLETE';
  }>;
  addListener(
    event: 'progress',
    listener: (event: { percent: number }) => void,
  ): Promise<PluginListenerHandle>;
}

export const androidUpdater =
  registerPlugin<AndroidUpdaterPlugin>('AppUpdater');
