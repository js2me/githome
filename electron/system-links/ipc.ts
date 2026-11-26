import { ipcMain, type BrowserWindow } from "electron";
import type { SystemLinkRouter } from "./router";

export function setupSystemLinks(
  router: SystemLinkRouter,
  getWindow: () => BrowserWindow | null,
  getOrigin: () => string | undefined,
) {
  const pending: string[] = [];
  const isLocal = (url: string) => {
    if (!URL.canParse(url)) return false;
    const { origin, pathname } = new URL(url);
    return origin === getOrigin() && !pathname.startsWith("/git-proxy/");
  };
  const handlers = {
    state: () => router.getState(),
    enable: (enabled: unknown) => {
      if (typeof enabled !== "boolean") throw new Error("Invalid link setting");
      return router.setEnabled(enabled);
    },
    sync: (urls: unknown) => router.syncGitlabs(urls),
    take: () => pending.splice(0),
  };

  for (const [name, callback] of Object.entries(handlers)) {
    ipcMain.handle(`system-links:${name}`, (event, value: unknown) => {
      const frame = event.senderFrame;
      if (event.sender !== getWindow()?.webContents ||
        !frame || frame !== event.sender.mainFrame || !isLocal(frame.url)) {
        throw new Error("System link routing is only available in the GitHome window");
      }
      return callback(value);
    });
  }

  return (url: string) => {
    pending.push(url);
    const contents = getWindow()?.webContents;
    if (contents && !contents.isDestroyed() && isLocal(contents.getURL())) {
      contents.send("system-links:pending");
    }
  };
}
