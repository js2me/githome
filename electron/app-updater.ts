import { app, BrowserWindow, ipcMain, shell } from "electron";
import updater from "electron-updater";
import type { AppUpdateState } from "../src/shared/lib/app-update/types";

const { autoUpdater } = updater;
const releasesUrl = "https://github.com/js2me/githome/releases/latest";

export function setupAppUpdater() {
  let state: AppUpdateState = { status: "idle", version: app.getVersion() };
  const setState = (update: Omit<AppUpdateState, "version">) => {
    state = { version: app.getVersion(), ...update };
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send("app-update:state", state);
    }
  };

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on("error", (error) => {
    console.error("App update failed", error);
    setState({ status: "error", message: "Не удалось обновить приложение. Проверьте соединение и попробуйте снова." });
  });
  autoUpdater.on("update-not-available", () => setState({ status: "current" }));
  autoUpdater.on("download-progress", ({ percent }) => {
    setState({ status: "downloading", nextVersion: state.nextVersion, progress: Math.round(percent) });
  });
  autoUpdater.on("update-downloaded", ({ version }) => {
    setState({ status: "ready", nextVersion: version });
  });

  ipcMain.handle("app-update:get-state", () => state);
  ipcMain.handle("app-update:check", async () => {
    if (["checking", "downloading", "ready"].includes(state.status)) return;
    if (!app.isPackaged) {
      setState({ status: "manual", message: "Обновление доступно в установленной версии приложения." });
      return;
    }
    if ((process.platform === "linux" && !process.env.APPIMAGE) || process.platform === "darwin") {
      try {
        await shell.openExternal(releasesUrl);
        setState({ status: "manual", message: "Скачайте и установите новую версию с открывшейся страницы релизов." });
      } catch {
        setState({ status: "error", message: "Не удалось открыть страницу релизов." });
      }
      return;
    }
    setState({ status: "checking" });
    try {
      const result = await autoUpdater.checkForUpdates();
      if (result?.isUpdateAvailable) {
        setState({ status: "downloading", nextVersion: result.updateInfo.version, progress: 0 });
        await autoUpdater.downloadUpdate();
      } else if (state.status === "checking") {
        setState({ status: "current" });
      }
    } catch (error) {
      console.error("App update failed", error);
      setState({ status: "error", message: "Не удалось обновить приложение. Проверьте соединение и попробуйте снова." });
    }
  });
  ipcMain.handle("app-update:install", () => {
    if (state.status === "ready") autoUpdater.quitAndInstall();
  });
}
