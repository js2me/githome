import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export type WebScheme = "http" | "https";
const run = promisify(execFile);
const linuxHandler = "githome.desktop";
const macHandler = "com.js2me.githome";
const desktopId = /^[\w.-]+\.desktop$/;
const bundleId = /^[\w][\w.-]*$/;

export interface LinkPlatform {
  ownHandler: string;
  schemes: readonly WebScheme[];
  isAvailable: () => Promise<boolean>;
  getDefault: (scheme: WebScheme) => Promise<string>;
  setDefault: (scheme: WebScheme, handler: string) => Promise<void>;
  canOpen: (handler: string) => Promise<boolean>;
  openWith: (handler: string, url: string) => Promise<void>;
}

async function firstAccessible(paths: string[]) {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch {
      // Try the next XDG data directory.
    }
  }
}

function desktopFile(handler: string) {
  const dirs = [
    process.env.XDG_DATA_HOME || path.join(homedir(), ".local/share"),
    ...(process.env.XDG_DATA_DIRS || "/usr/local/share:/usr/share").split(":"),
  ].filter((dir) => path.isAbsolute(dir));
  return firstAccessible(dirs.map((dir) => path.join(dir, "applications", handler)));
}

export function createLinkPlatform(isPackaged: boolean): LinkPlatform | undefined {
  if (!isPackaged) return;
  if (process.platform === "linux" && !process.env.APPIMAGE) {
    return {
      ownHandler: linuxHandler,
      schemes: ["https"],
      isAvailable: async () => Boolean(await desktopFile(linuxHandler)),
      getDefault: async (scheme) =>
        (await run("xdg-mime", ["query", "default", `x-scheme-handler/${scheme}`])).stdout.trim(),
      setDefault: async (scheme, handler) => {
        if (!desktopId.test(handler)) throw new Error("Invalid desktop handler");
        await run("xdg-mime", ["default", handler, `x-scheme-handler/${scheme}`]);
      },
      canOpen: async (handler) => desktopId.test(handler) && Boolean(await desktopFile(handler)),
      openWith: async (handler, url) => {
        const file = desktopId.test(handler) ? await desktopFile(handler) : undefined;
        if (!file) throw new Error("Browser desktop entry not found");
        await run("gio", ["launch", file, url]);
      },
    };
  }

  if (process.platform === "darwin") {
    const helper = path.resolve(process.resourcesPath, "../Helpers/link-handler");
    const appBundle = path.resolve(process.resourcesPath, "../..");
    return {
      ownHandler: macHandler,
      // macOS may switch both schemes when changing the default web browser.
      schemes: ["https", "http"],
      isAvailable: async () => Boolean(await firstAccessible([helper])),
      getDefault: async (scheme) => (await run(helper, ["get", scheme])).stdout.trim(),
      setDefault: async (scheme, handler) => {
        if (!bundleId.test(handler)) throw new Error("Invalid browser bundle ID");
        await run(helper, ["set", scheme, handler, appBundle], { timeout: 120_000 });
      },
      canOpen: async (handler) => {
        if (!bundleId.test(handler)) return false;
        try {
          await run(helper, ["find", handler]);
          return true;
        } catch {
          return false;
        }
      },
      openWith: async (handler, url) => {
        if (!bundleId.test(handler)) throw new Error("Invalid browser bundle ID");
        await run("/usr/bin/open", ["-b", handler, url]);
      },
    };
  }
}
