import { app, BrowserWindow, Menu, dialog, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startAppServer } from "./app-server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getDistPath = () =>
  path.join(
    app.isPackaged ? app.getAppPath() : path.join(__dirname, ".."),
    "dist",
  );

const preloadPath = path.join(__dirname, "preload.mjs");

let mainWindow: BrowserWindow | null = null;
let appServer: Awaited<ReturnType<typeof startAppServer>> | null = null;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

const resolvePageUrl = async (): Promise<string> => {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL?.trim();
  if (!app.isPackaged && devServerUrl) {
    return devServerUrl;
  }

  const distPath = getDistPath();
  appServer ??= await startAppServer(distPath);

  if (!appServer.url) {
    throw new Error(`Failed to resolve app URL (dist: ${distPath})`);
  }

  return appServer.url;
};

const createWindow = async () => {
  let pageUrl: string;

  try {
    pageUrl = await resolvePageUrl();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start GitHome";
    console.error(message, error);
    dialog.showErrorBox("GitHome", message);
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    title: "GitHome",
    width: 1024,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (
      input.type === "keyDown" &&
      (input.control || input.meta) &&
      input.key.toLowerCase() === "f"
    ) {
      event.preventDefault();
    }
  });

  try {
    await mainWindow.loadURL(pageUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to open GitHome window";
    console.error(message, error);
    dialog.showErrorBox("GitHome", message);
    app.quit();
  }
};

if (gotSingleInstanceLock) {
  app.on("second-instance", () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    void createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void appServer?.close();
});
