import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
import updater from "electron-updater";
import type { AppUpdateState } from "../src/shared/lib/app-update/types";

export function setupAppUpdater(getAppOrigin: () => string | undefined) {
  const autoUpdater = process.platform === "linux" && process.env.APPIMAGE
    ? new updater.AppImageUpdater()
    : updater.autoUpdater;
  let state: AppUpdateState = { status: "idle", version: app.getVersion() };

  const isAppUrl = (url: string) =>
    URL.canParse(url) && new URL(url).origin === getAppOrigin();

  const handle = (name: string, callback: () => AppUpdateState | void | Promise<void>) => {
    ipcMain.handle(`app-update:${name}`, (event: IpcMainInvokeEvent) => {
      const frame = event.senderFrame;
      if (!frame || frame !== event.sender.mainFrame || !isAppUrl(frame.url)) {
        throw new Error("App updates are only available in the GitHome window.");
      }
      return callback();
    });
  };

  const setState = (update: Omit<AppUpdateState, "version">) => {
    state = { version: app.getVersion(), ...update };
    for (const window of BrowserWindow.getAllWindows()) {
      if (isAppUrl(window.webContents.getURL())) {
        window.webContents.send("app-update:state", state);
      }
    }
  };

  const fail = (error: unknown) => {
    if (state.status === "error") return;
    console.error("App update failed", error);
    setState({
      status: "error",
      message: state.status === "installing"
        ? "Не удалось установить обновление. Проверьте разрешения и попробуйте снова."
        : "Не удалось получить обновление. Проверьте соединение и попробуйте снова.",
    });
  };

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.disableWebInstaller = true;
  autoUpdater.on("error", fail);
  autoUpdater.on("download-progress", ({ percent }) => {
    if (state.status === "downloading") {
      setState({ ...state, progress: Math.min(100, Math.round(percent)) });
    }
  });
  autoUpdater.on("update-downloaded", ({ version }) => {
    if (state.status === "downloading") {
      setState({ status: "ready", nextVersion: version });
    }
  });

  handle("get-state", () => state);
  handle("check", async () => {
    if (["checking", "downloading", "ready", "installing"].includes(state.status)) return;
    if (!app.isPackaged) {
      setState({ status: "manual", message: "Установка обновлений доступна в установленной сборке GitHome." });
      return;
    }

    setState({ status: "checking" });
    try {
      const result = await autoUpdater.checkForUpdates();
      if (result?.isUpdateAvailable) {
        setState({ status: "available", nextVersion: result.updateInfo.version });
      } else if (result) {
        setState({ status: "current" });
      } else {
        setState({ status: "manual", message: "Для этой сборки обновление доступно на странице релизов." });
      }
    } catch (error) {
      fail(error);
    }
  });

  handle("download", async () => {
    if (state.status !== "available") return;
    setState({ status: "downloading", nextVersion: state.nextVersion, progress: 0 });
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      fail(error);
    }
  });

  handle("install", () => {
    if (state.status !== "ready") return;
    setState({ status: "installing", nextVersion: state.nextVersion });
    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      fail(error);
    }
  });
}
