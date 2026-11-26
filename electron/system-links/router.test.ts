import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkPlatform } from "./platform";
import { SystemLinkRouter } from "./router";

const mr = "https://gitlab.corp.mail.ru/oneui/frontend/nova-sdk/-/merge_requests/155";
const chrome = "chrome.desktop";
const firefox = "firefox.desktop";
const gitHome = "githome.desktop";
let directory: string;
let config: string;
let defaults: Record<"http" | "https", string>;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "githome-links-"));
  config = path.join(directory, "links.json");
  defaults = { http: firefox, https: chrome };
});

afterEach(() => rmSync(directory, { recursive: true, force: true }));

function setup(overrides: Partial<LinkPlatform> = {}) {
  const platform = {
    ownHandler: gitHome,
    schemes: ["https", "http"],
    isAvailable: async () => true,
    getDefault: async (scheme) => defaults[scheme],
    setDefault: vi.fn(async (scheme, handler) => { defaults[scheme] = handler; }),
    canOpen: async (handler) => [chrome, firefox].includes(handler),
    openWith: vi.fn(async () => undefined),
    ...overrides,
  } satisfies LinkPlatform;
  const external = vi.fn(async () => undefined);
  const router = new SystemLinkRouter(config, platform, external);
  return { platform, router, external };
}

describe("system link routing", () => {
  it("handles only valid MRs under a configured GitLab base while enabled", async () => {
    const { router } = setup();
    router.syncGitlabs(["gitlab.corp.mail.ru/oneui"]);
    expect(await router.shouldOpenMergeRequest(mr)).toBe(false);
    expect(await router.setEnabled(true)).toEqual({ available: true, enabled: true });
    expect(await router.shouldOpenMergeRequest(`${mr}/diffs?view=parallel#note_6`)).toBe(true);
    for (const url of [
      mr.replace("oneui/", "oneui-other/"),
      mr.replace("gitlab.corp.mail.ru", "gitlab.corp.mail.ru.example"),
      mr.replace("merge_requests", "issues"),
      mr.replace("nova-sdk", "%2E%2E%2Fproject"),
      mr.replace("/155", "/0"),
      mr.replace("https:", "http:"),
    ]) {
      expect(await router.shouldOpenMergeRequest(url)).toBe(false);
    }
    router.syncGitlabs([]);
    expect(await router.shouldOpenMergeRequest(mr)).toBe(false);
  });

  it("remembers the browser before taking over and opens non-MRs there after restarting", async () => {
    const { router } = setup();
    router.syncGitlabs(["https://gitlab.corp.mail.ru?secret=not-stored"]);
    await router.setEnabled(true);
    expect(readFileSync(config, "utf8")).not.toContain("not-stored");

    const { router: restarted, platform, external } = setup();
    expect(await restarted.shouldOpenMergeRequest(mr)).toBe(true);
    await restarted.openInBrowser("https://example.org/docs?p=a%20b#section");
    expect(platform.openWith).toHaveBeenCalledWith(chrome, "https://example.org/docs?p=a%20b#section");
    expect(external).not.toHaveBeenCalled();

    expect(await restarted.setEnabled(false)).toEqual({ available: true, enabled: false });
    expect(defaults).toEqual({ http: firefox, https: chrome });
    await restarted.openInBrowser("https://example.org/");
    expect(external).toHaveBeenCalledWith("https://example.org/");
  });

  it("also forwards and restores HTTP when the system switches both browser schemes", async () => {
    const { router, platform } = setup({
      setDefault: async (scheme, handler) => {
        defaults[scheme] = handler;
        if (scheme === "https") defaults.http = handler;
      },
    });
    router.syncGitlabs(["gitlab.corp.mail.ru"]);
    await router.setEnabled(true);
    expect(defaults).toEqual({ http: gitHome, https: gitHome });
    await router.openInBrowser("http://example.org/");
    await router.openInBrowser("file:///tmp/example.html");
    expect(platform.openWith).toHaveBeenNthCalledWith(1, firefox, "http://example.org/");
    expect(platform.openWith).toHaveBeenNthCalledWith(2, chrome, "file:///tmp/example.html");

    await router.setEnabled(false);
    expect(defaults).toEqual({ http: firefox, https: chrome });
  });

  it("does not override a browser selected after GitHome was enabled", async () => {
    const { router, platform } = setup();
    router.syncGitlabs(["gitlab.corp.mail.ru"]);
    await router.setEnabled(true);
    defaults.https = firefox;
    await router.setEnabled(false);
    expect(defaults.https).toBe(firefox);
    expect(platform.setDefault).toHaveBeenCalledTimes(1);
  });

  it("does not take over the handler when there is no browser or GitLab configured", async () => {
    const { router, platform } = setup();
    await expect(router.setEnabled(true)).rejects.toThrow("No configured GitLab");
    router.syncGitlabs(["gitlab.corp.mail.ru"]);
    defaults.https = "";
    await expect(router.setEnabled(true)).rejects.toThrow("No default browser");
    expect(platform.setDefault).not.toHaveBeenCalled();
  });

  it("never forwards a link back to the system default when that is GitHome", async () => {
    defaults.https = gitHome;
    const { router, external, platform } = setup();
    await expect(router.openInBrowser("https://example.org")).rejects.toThrow("No browser");
    expect(external).not.toHaveBeenCalled();
    expect(platform.openWith).not.toHaveBeenCalled();
  });
});
