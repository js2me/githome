import { app, BrowserWindow, Menu, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startAppServer } from "./app-server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");
process.env.DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

const preloadPath = path.join(__dirname, "preload.mjs");
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let mainWindow: BrowserWindow | null = null;
let appServer: Awaited<ReturnType<typeof startAppServer>> | null = null;

const createWindow = async () => {
  const pageUrl = isDev
    ? process.env.VITE_DEV_SERVER_URL!
    : (appServer ??= await startAppServer(process.env.DIST!)).url;

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
      sandbox: true,
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

  await mainWindow.loadURL(pageUrl);
};

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  void createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void appServer?.close();
});
