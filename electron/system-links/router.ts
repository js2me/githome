import { readFileSync, renameSync, writeFileSync } from "node:fs";
import {
  normalizeGitlabBaseUrl,
  parseWebUrl,
} from "../../src/shared/lib/gitlab/links/gitlab-url";
import { parseMergeRequestLocation } from "../../src/shared/lib/gitlab/links/merge-request";
import { matchGitlabProject } from "../../src/shared/lib/gitlab/links/project";
import type { SystemLinksState } from "../../src/shared/lib/system-links/types";
import type { LinkPlatform, WebScheme } from "./platform";

interface Settings {
  gitlabs: string[];
  previous: Partial<Record<WebScheme, string>>;
}

function normalizeGitlabs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.flatMap((value) => {
    if (typeof value !== "string") return [];
    const url = parseWebUrl(normalizeGitlabBaseUrl(value));
    return url && !url.username && !url.password
      ? [`${url.origin}${url.pathname}`]
      : [];
  }))];
}

function loadSettings(file: string): Settings {
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    return {
      gitlabs: normalizeGitlabs(data.gitlabs),
      previous: {
        https: typeof data.previous?.https === "string" ? data.previous.https : undefined,
        http: typeof data.previous?.http === "string" ? data.previous.http : undefined,
      },
    };
  } catch {
    return { gitlabs: [], previous: {} };
  }
}

export class SystemLinkRouter {
  private readonly settings: Settings;
  private changing = false;

  constructor(
    private readonly file: string,
    private readonly platform: LinkPlatform | undefined,
    private readonly openExternal: (url: string) => Promise<void>,
  ) {
    this.settings = loadSettings(file);
  }

  private save() {
    const temporary = `${this.file}.tmp`;
    writeFileSync(temporary, JSON.stringify(this.settings), { mode: 0o600 });
    renameSync(temporary, this.file);
  }

  syncGitlabs(urls: unknown) {
    if (!this.platform) return;
    const gitlabs = normalizeGitlabs(urls);
    if (JSON.stringify(gitlabs) === JSON.stringify(this.settings.gitlabs)) return;
    this.settings.gitlabs = gitlabs;
    this.save();
  }

  async getState(): Promise<SystemLinksState> {
    const platform = this.platform;
    if (!platform || !(await platform.isAvailable()))
      return { available: false, enabled: false };
    const defaults = await Promise.all(platform.schemes.map((scheme) => platform.getDefault(scheme)));
    return { available: true, enabled: defaults.includes(platform.ownHandler) };
  }

  async setEnabled(enabled: boolean): Promise<SystemLinksState> {
    const platform = this.platform;
    if (!platform || this.changing) return this.getState();
    this.changing = true;
    try {
      if (!(await platform.isAvailable())) return { available: false, enabled: false };
      if (enabled) {
        if (!this.settings.gitlabs.length)
          throw new Error("No configured GitLab connections");
        const previous = { ...this.settings.previous };
        for (const scheme of platform.schemes) {
          const current = await platform.getDefault(scheme);
          if (current !== platform.ownHandler) {
            previous[scheme] = current || undefined;
          }
        }

        const browser = previous.https;
        if (!browser || browser === platform.ownHandler || !(await platform.canOpen(browser)))
          throw new Error("No default browser to forward links to");
        previous.http ??= browser;

        // Save the browser before taking over HTTPS, including across an app restart.
        this.settings.previous = previous;
        this.save();
        if (await platform.getDefault("https") !== platform.ownHandler) {
          await platform.setDefault("https", platform.ownHandler);
          if (await platform.getDefault("https") !== platform.ownHandler)
            throw new Error("The system did not switch the HTTPS handler");
        }
      } else {
        // Take a snapshot before restoring. macOS can change both defaults at once.
        const current = await Promise.all(platform.schemes.map((scheme) => platform.getDefault(scheme)));
        for (const [index, scheme] of platform.schemes.entries()) {
          const browser = current[index] === platform.ownHandler
            ? this.settings.previous[scheme] ?? this.settings.previous.https
            : current[index];
          if (browser && browser !== platform.ownHandler &&
            await platform.getDefault(scheme) !== browser && await platform.canOpen(browser)) {
            await platform.setDefault(scheme, browser);
          }
        }
        const state = await this.getState();
        if (state.enabled) throw new Error("The system did not restore the previous browser");
        return state;
      }
      return await this.getState();
    } finally {
      this.changing = false;
    }
  }

  async shouldOpenMergeRequest(input: string) {
    const platform = this.platform;
    const location = parseMergeRequestLocation(input);
    if (!platform || !location ||
      !this.settings.gitlabs.some((base) => matchGitlabProject(location, base))) return false;
    const scheme = location.origin.startsWith("https:") ? "https" : "http";
    return platform.schemes.includes(scheme) && await platform.getDefault(scheme) === platform.ownHandler;
  }

  async openInBrowser(input: string) {
    const platform = this.platform;
    if (input.startsWith("file:") && platform?.schemes.includes("http")) {
      const current = await platform.getDefault("https");
      const browser = current === platform.ownHandler ? this.settings.previous.https : current;
      if (!browser || browser === platform.ownHandler)
        throw new Error("No browser to open the HTML file");
      await platform.openWith(browser, input);
      return;
    }

    const url = parseWebUrl(input);
    const scheme = url?.protocol === "https:" ? "https" : "http";
    if (url && platform?.schemes.includes(scheme) &&
      await platform.getDefault(scheme) === platform.ownHandler) {
      const browser = this.settings.previous[scheme] ?? this.settings.previous.https;
      if (!browser || browser === platform.ownHandler)
        throw new Error("No browser to forward the link to");
      // Opening the system default here would send the link back to GitHome.
      await platform.openWith(browser, url.href);
      return;
    }
    await this.openExternal(input);
  }
}
