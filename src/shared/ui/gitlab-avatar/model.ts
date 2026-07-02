import { action, computed, observable, reaction, runInAction } from "mobx";
import {
  fetchGitlabAssetBlob,
  isGitlabProxiedAssetUrl,
  resolveGitlabAssetUrl,
} from "@/shared/api/gitlab";
import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { VM } from "@/shared/lib/view-models/vm";

export interface GitlabAvatarPayload {
  avatarUrl: string | null | undefined;
  name: string;
  className?: string;
}

export class GitlabAvatarVM extends VM<GitlabAvatarPayload> {
  @observable accessor displaySrc: string | null = null;
  @observable accessor hasError = false;

  private objectUrl: string | null = null;

  @computed
  get connection() {
    return this.globals.stores.settings.activeConnection;
  }

  @computed
  get src() {
    if (!this.payload.avatarUrl) {
      return null;
    }

    return this.connection
      ? resolveGitlabAssetUrl(this.connection, this.payload.avatarUrl)
      : this.payload.avatarUrl;
  }

  @computed
  get showImage() {
    return Boolean(this.displaySrc && !this.hasError);
  }

  @action.bound
  handleImageError() {
    this.hasError = true;
  }

  @action.bound
  private resetState() {
    this.revokeObjectUrl();
    this.displaySrc = null;
    this.hasError = false;
  }

  @action.bound
  private applyDisplaySrc(
    src: string | null,
    avatarUrl: string | null | undefined,
    connection: GitLabConnection | null,
  ) {
    this.resetState();

    if (!src || !avatarUrl) {
      return;
    }

    if (!isGitlabProxiedAssetUrl(src)) {
      this.displaySrc = src;
      return;
    }

    if (!connection) {
      this.hasError = true;
      return;
    }

    void this.loadProxiedAvatar(connection, avatarUrl);
  }

  private async loadProxiedAvatar(
    connection: GitLabConnection,
    avatarUrl: string,
  ) {
    const signal = this.unmountSignal;
    const requestAvatarUrl = avatarUrl;

    try {
      const blob = await fetchGitlabAssetBlob(connection, avatarUrl, signal);

      if (signal.aborted || requestAvatarUrl !== this.payload.avatarUrl) {
        return;
      }

      const objectUrl = URL.createObjectURL(blob);

      runInAction(() => {
        if (requestAvatarUrl !== this.payload.avatarUrl) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        this.revokeObjectUrl();
        this.objectUrl = objectUrl;
        this.displaySrc = objectUrl;
        this.hasError = false;
      });
    } catch {
      if (signal.aborted || requestAvatarUrl !== this.payload.avatarUrl) {
        return;
      }

      runInAction(() => {
        if (requestAvatarUrl !== this.payload.avatarUrl) {
          return;
        }

        this.hasError = true;
      });
    }
  }

  private revokeObjectUrl() {
    if (!this.objectUrl) {
      return;
    }

    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }


  willMount() {
    reaction(
      () => ({
        src: this.src,
        avatarUrl: this.payload.avatarUrl,
        connection: this.connection,
      }),
      ({ src, avatarUrl, connection }) => {
        this.applyDisplaySrc(src, avatarUrl, connection);
      },
      { fireImmediately: true },
    );
  }

  didUnmount() {
    this.revokeObjectUrl();
  }
}
