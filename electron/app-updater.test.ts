import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: any[]) => any>(),
  events: new Map<string, (...args: any[]) => any>(),
  app: { isPackaged: true, getVersion: () => "0.1.10" },
  send: vi.fn(),
  openExternal: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
}));
vi.mock("electron", () => ({
  app: mocks.app,
  BrowserWindow: { getAllWindows: () => [{ webContents: { send: mocks.send } }] },
  ipcMain: { handle: (name: string, handler: (...args: any[]) => any) => mocks.handlers.set(name, handler) },
  shell: { openExternal: mocks.openExternal },
}));
vi.mock("electron-updater", () => ({ default: { autoUpdater: {
  on: (name: string, handler: (...args: any[]) => any) => mocks.events.set(name, handler),
  checkForUpdates: mocks.checkForUpdates,
  downloadUpdate: mocks.downloadUpdate,
  quitAndInstall: mocks.quitAndInstall,
} } }));
import { setupAppUpdater } from "./app-updater";
const invoke = (name: string) => mocks.handlers.get(`app-update:${name}`)!();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APPIMAGE", "/opt/GitHome.AppImage");
  mocks.app.isPackaged = true;
  setupAppUpdater();
});

it("downloads a new release and installs only after an explicit request", async () => {
  invoke("install");
  expect(mocks.quitAndInstall).not.toHaveBeenCalled();
  mocks.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, updateInfo: { version: "0.1.11" } });
  await invoke("check");
  expect(mocks.downloadUpdate).toHaveBeenCalledOnce();
  mocks.events.get("download-progress")!({ percent: 43.6 });
  expect(invoke("get-state")).toMatchObject({ status: "downloading", progress: 44 });
  mocks.events.get("update-downloaded")!({ version: "0.1.11" });
  expect(invoke("get-state")).toMatchObject({ status: "ready", nextVersion: "0.1.11" });
  await invoke("check");
  expect(mocks.checkForUpdates).toHaveBeenCalledOnce();
  invoke("install");
  expect(mocks.quitAndInstall).toHaveBeenCalledOnce();
});

it("reports no available update without downloading", async () => {
  mocks.checkForUpdates.mockResolvedValue({ isUpdateAvailable: false });
  await invoke("check");
  expect(invoke("get-state").status).toBe("current");
  expect(mocks.downloadUpdate).not.toHaveBeenCalled();
});

it("allows retry after a failed check", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.checkForUpdates.mockRejectedValueOnce(new Error("offline"));
  await invoke("check");
  expect(invoke("get-state").status).toBe("error");
  mocks.checkForUpdates.mockResolvedValueOnce({ isUpdateAvailable: false });
  await invoke("check");
  expect(invoke("get-state").status).toBe("current");
  log.mockRestore();
});

it("does not check or install updates in development", async () => {
  mocks.app.isPackaged = false;
  await invoke("check");
  expect(invoke("get-state").status).toBe("manual");
  expect(mocks.checkForUpdates).not.toHaveBeenCalled();
});

it("opens GitHub releases for Linux installations without AppImage", async () => {
  if (process.platform !== "linux") return;
  vi.stubEnv("APPIMAGE", "");
  await invoke("check");
  expect(mocks.openExternal).toHaveBeenCalledWith("https://github.com/js2me/githome/releases/latest");
  expect(mocks.checkForUpdates).not.toHaveBeenCalled();
});
