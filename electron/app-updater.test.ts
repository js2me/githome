import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const events = new Map<string, (...args: any[]) => any>();
  return {
    handlers: new Map<string, (...args: any[]) => any>(),
    events,
    app: { isPackaged: true, getVersion: () => "0.1.10" },
    send: vi.fn(),
    updater: {
      on: (name: string, handler: (...args: any[]) => any) => events.set(name, handler),
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      quitAndInstall: vi.fn(),
    },
  };
});
const appOrigin = "http://127.0.0.1:1420";
const appFrame = { url: `${appOrigin}/` };
vi.mock("electron", () => ({
  app: mocks.app,
  BrowserWindow: { getAllWindows: () => [{ webContents: { send: mocks.send, getURL: () => appFrame.url } }] },
  ipcMain: { handle: (name: string, handler: (...args: any[]) => any) => mocks.handlers.set(name, handler) },
}));
vi.mock("electron-updater", () => ({ default: {
  autoUpdater: mocks.updater,
} }));
import { setupAppUpdater } from "./app-updater";

const invoke = (name: string) => mocks.handlers.get(`app-update:${name}`)!({
  sender: { mainFrame: appFrame },
  senderFrame: appFrame,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APPIMAGE", "");
  mocks.app.isPackaged = true;
  setupAppUpdater(() => appOrigin);
});
afterEach(() => vi.unstubAllEnvs());

it("checks, downloads and installs in separate user-triggered steps", async () => {
  invoke("install");
  expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled();

  mocks.updater.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, updateInfo: { version: "0.1.11" } });
  await invoke("check");
  expect(invoke("get-state")).toMatchObject({ status: "available", nextVersion: "0.1.11" });
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled();

  await invoke("download");
  expect(mocks.updater.downloadUpdate).toHaveBeenCalledOnce();
  mocks.events.get("download-progress")!({ percent: 43.6 });
  expect(invoke("get-state")).toMatchObject({ status: "downloading", progress: 44 });
  mocks.events.get("update-downloaded")!({ version: "0.1.11" });
  expect(invoke("get-state")).toMatchObject({ status: "ready", nextVersion: "0.1.11" });

  await invoke("check");
  expect(mocks.updater.checkForUpdates).toHaveBeenCalledOnce();
  invoke("install");
  invoke("install");
  expect(invoke("get-state").status).toBe("installing");
  expect(mocks.updater.quitAndInstall).toHaveBeenCalledExactlyOnceWith(false, true);
});

it("reports no available update without downloading", async () => {
  mocks.updater.checkForUpdates.mockResolvedValue({ isUpdateAvailable: false });
  await invoke("check");
  expect(invoke("get-state").status).toBe("current");
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled();
});

it("allows retry after a failed check", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    mocks.updater.checkForUpdates.mockRejectedValueOnce(new Error("offline"));
    await invoke("check");
    expect(invoke("get-state").status).toBe("error");
    mocks.updater.checkForUpdates.mockResolvedValueOnce({ isUpdateAvailable: false });
    await invoke("check");
    expect(invoke("get-state").status).toBe("current");
  } finally {
    log.mockRestore();
  }
});

it("does not check or install updates in development", async () => {
  mocks.app.isPackaged = false;
  await invoke("check");
  expect(invoke("get-state").status).toBe("manual");
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled();
});

it("allows a manual install when the desktop package does not support auto-update", async () => {
  mocks.updater.checkForUpdates.mockResolvedValue(null);
  await invoke("check");
  expect(invoke("get-state").status).toBe("manual");
});

it("rejects update commands from other origins or subframes", () => {
  const check = mocks.handlers.get("app-update:check")!;
  const externalFrame = { url: "https://example.com" };
  expect(() => check({ sender: { mainFrame: externalFrame }, senderFrame: externalFrame })).toThrow();
  expect(() => check({ sender: { mainFrame: appFrame }, senderFrame: { url: appFrame.url } })).toThrow();
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled();
});
