import { app, BrowserWindow, Menu, dialog, shell } from "electron";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setupAppUpdater } from "./app-updater";
import { startAppServer } from "./app-server";
import { setupSystemLinks } from "./system-links/ipc";
import { createLinkPlatform } from "./system-links/platform";
import { SystemLinkRouter } from "./system-links/router";
import { parseWebUrl } from "../src/shared/lib/gitlab/links/gitlab-url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getDistPath = () =>
  path.join(
    app.isPackaged ? app.getAppPath() : path.join(__dirname, ".."),
    "dist",
  );

const preloadPath = path.join(__dirname, "preload.cjs");

let mainWindow: BrowserWindow | null = null;
let appServer: Awaited<ReturnType<typeof startAppServer>> | null = null;
let appOrigin: string | undefined;
let creatingWindow: Promise<void> | undefined;
let linkRouter: SystemLinkRouter | undefined;

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

  appOrigin = new URL(pageUrl).origin;
  mainWindow = new BrowserWindow({
    title: "GitHome",
    icon: process.platform === "linux"
      ? path.join(app.isPackaged ? process.resourcesPath : path.join(__dirname, "..", "resources"), "icon.png")
      : undefined,
    width: 1024,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void (linkRouter?.openInBrowser(url) ?? shell.openExternal(url)).catch(showLinkError);
    return { action: "deny" };
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

function showLinkError() {
  dialog.showErrorBox(
    "GitHome",
    "Could not open this link. Check your default browser in system settings.",
  );
}

function focusWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function ensureWindow() {
  if (creatingWindow) return creatingWindow;
  if (mainWindow) return Promise.resolve();
  creatingWindow = createWindow().finally(() => {
    creatingWindow = undefined;
  });
  return creatingWindow;
}

const webArgs = (argv: string[]) => argv.filter((arg) => Boolean(parseWebUrl(arg)));

if (gotSingleInstanceLock) {
  let startupLinks = process.platform === "darwin" ? [] : webArgs(process.argv.slice(1));
  let receiveLinks = (urls: string[]) => {
    startupLinks.push(...urls);
  };
  let openedNormally = false;

  app.on("open-url", (event, url) => {
    event.preventDefault();
    if (parseWebUrl(url)) receiveLinks([url]);
  });

  app.on("open-file", (event, file) => {
    if (!/\.html?$/i.test(file) || !path.isAbsolute(file)) return;
    event.preventDefault();
    receiveLinks([pathToFileURL(file).href]);
  });

  app.on("second-instance", (_event, argv) => {
    const urls = webArgs(argv.slice(1));
    if (urls.length) receiveLinks(urls);
    else {
      openedNormally = true;
      if (app.isReady()) void ensureWindow().then(focusWindow);
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    setupAppUpdater(() => appOrigin);
    const router = new SystemLinkRouter(
      path.join(app.getPath("userData"), "system-links.json"),
      createLinkPlatform(app.isPackaged),
      (url) => shell.openExternal(url),
    );
    linkRouter = router;
    const enqueue = setupSystemLinks(router, () => mainWindow, () => appOrigin);
    const startedWithLink = startupLinks.length > 0;
    let dispatch = Promise.resolve();
    let generation = 0;
    receiveLinks = (urls) => {
      const batch = ++generation;
      dispatch = dispatch.then(async () => {
        for (const url of urls) {
          try {
            if (await router.shouldOpenMergeRequest(url)) {
              enqueue(url);
              await ensureWindow();
              openedNormally = true;
              focusWindow();
            } else {
              await router.openInBrowser(url);
            }
          } catch {
            showLinkError();
          }
        }
        if (batch === generation && startedWithLink && !openedNormally && !mainWindow) {
          app.quit();
        }
      });
    };

    if (startedWithLink) {
      receiveLinks(startupLinks);
      startupLinks = [];
    }
    if (!startedWithLink || openedNormally) void ensureWindow();

    app.on("activate", (_event, hasVisibleWindows) => {
      if (!hasVisibleWindows) {
        void dispatch.then(() => {
          if (!startedWithLink || mainWindow || openedNormally) void ensureWindow();
        });
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
