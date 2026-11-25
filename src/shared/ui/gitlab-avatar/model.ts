import { actionBound, computedStruct, observable, reaction, runInAction } from "mobx";
import {
  fetchGitlabAssetBlob,
  isGitlabProxiedAssetUrl,
  normalizeGitlabBaseUrl,
  resolveGitlabAssetUrl,
} from "@/shared/api/gitlab";
import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { VM } from "@/shared/lib/view-models/vm";

export interface GitlabAvatarPayload {
  avatarUrl: string | null | undefined;
  name: string;
  className?: string;
  connection?: GitLabConnection | null;
}

const resolveAvatar = (raw: string | null | undefined, connection: GitLabConnection | null) => {
  if (!raw?.trim()) return null;
  try {
    const base = connection && new URL(normalizeGitlabBaseUrl(connection.gitlabUrl) + "/");
    const url = new URL(raw, base ?? globalThis.location?.href);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      if (url.protocol === "blob:" || /^data:image\//i.test(url.href)) {
        return { direct: url.href, account: null, preferAuthenticated: false };
      }
      return null;
    }
    if (url.username || url.password) return null;
    let hadToken = false;
    // GitLab account credentials belong in authenticated request headers, never in img.src.
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:private_token|access_token|oauth_token)$/i.test(key)) {
        url.searchParams.delete(key);
        hadToken = true;
      }
    }
    const direct = url.href;
    const account = url.origin === base?.origin ? connection : null;
    const resolved = account && resolveGitlabAssetUrl(account, direct);
    const useProxy = Boolean(resolved && isGitlabProxiedAssetUrl(resolved));
    return { direct, account, preferAuthenticated: Boolean(account && (hadToken || useProxy)) };
  } catch {
    return null;
  }
};

export class GitlabAvatarVM extends VM<GitlabAvatarPayload> {
  @observable accessor displaySrc: string | null = null;

  private objectUrl: string | null = null;
  private request: AbortController | null = null;
  private triedDirect = false;

  @computedStruct
  private get source() {
    const connection = this.payload.connection === undefined
      ? this.globals.stores.settings.activeConnection
      : this.payload.connection;
    return resolveAvatar(this.payload.avatarUrl, connection);
  }

  private showDirect() {
    this.triedDirect = true;
    this.displaySrc = this.source?.direct ?? null;
  }

  @actionBound
  handleImageError() {
    if (this.source?.account && !this.request) {
      this.displaySrc = null;
      void this.loadAuthenticated(this.source.account, this.source.direct);
    } else if (!this.triedDirect) {
      this.showDirect();
    } else {
      this.displaySrc = null;
    }
  }

  private async loadAuthenticated(connection: GitLabConnection, avatarUrl: string) {
    const controller = new AbortController();
    this.request = controller;
    try {
      const blob = await fetchGitlabAssetBlob(connection, avatarUrl, controller.signal);
      if (controller.signal.aborted) return;
      runInAction(() => {
        this.objectUrl = URL.createObjectURL(blob);
        this.displaySrc = this.objectUrl;
      });
    } catch {
      if (!controller.signal.aborted) this.handleImageError();
    }
  }

  private releaseSource() {
    this.request?.abort();
    this.request = null;
    this.triedDirect = false;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }

  willMount() {
    reaction(
      () => this.source,
      (source) => {
        this.releaseSource();
        this.displaySrc = null;
        if (!source) return;
        if (source.preferAuthenticated && source.account) {
          void this.loadAuthenticated(source.account, source.direct);
        } else {
          this.showDirect();
        }
      },
      { fireImmediately: true, signal: this.unmountSignal },
    );
  }

  didUnmount() {
    this.releaseSource();
  }
}
