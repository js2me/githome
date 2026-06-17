import { action, computed } from "mobx";
import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { getConnectionLabel } from "@/shared/lib/gitlab/connection";
import {
  connectionsKey,
  type ConnectionsStorage,
  type GitLabConnectionItem,
} from "@/shared/lib/storage";

const toActiveConnection = (
  snapshot: ConnectionsStorage,
): GitLabConnection | null => {
  if (!snapshot.activeId) {
    return null;
  }

  const item = snapshot.items.find(
    (connection) => connection.id === snapshot.activeId,
  );

  if (!item) {
    return null;
  }

  const gitlabUrl = item.gitlabUrl.trim();
  const gitToken = item.gitToken.trim();

  if (!gitlabUrl || !gitToken) {
    return null;
  }

  return {
    id: item.id,
    gitlabUrl,
    gitToken,
  };
};

const createConnectionItem = (
  gitlabUrl: string,
  gitToken: string,
): GitLabConnectionItem => ({
  id: crypto.randomUUID(),
  gitlabUrl: gitlabUrl.trim(),
  gitToken: gitToken.trim(),
});

export class SettingsStore {
  @computed.struct
  get snapshot(): ConnectionsStorage {
    return connectionsKey.value;
  }

  @computed
  get connections(): GitLabConnectionItem[] {
    return this.snapshot.items;
  }

  @computed
  get activeId(): string | null {
    return this.snapshot.activeId;
  }

  @computed
  get activeItem(): GitLabConnectionItem | null {
    if (!this.activeId) {
      return null;
    }

    return (
      this.connections.find((connection) => connection.id === this.activeId) ??
      null
    );
  }

  @computed
  get activeConnection(): GitLabConnection | null {
    return toActiveConnection(this.snapshot);
  }

  @computed.struct
  get connectionOptions() {
    return this.connections.map((connection) => ({
      id: connection.id,
      label: getConnectionLabel(connection),
    }));
  }

  @computed
  get isConfigured() {
    return Boolean(this.activeConnection);
  }

  @action
  setActiveConnection(id: string | null) {
    connectionsKey.value = {
      ...this.snapshot,
      activeId: id,
    };
  }

  @action
  addConnection(gitlabUrl: string, gitToken: string): string | null {
    const item = createConnectionItem(gitlabUrl, gitToken);

    if (!item.gitlabUrl || !item.gitToken) {
      return null;
    }

    connectionsKey.value = {
      activeId: item.id,
      items: [...this.connections, item],
    };

    return item.id;
  }

  @action
  updateConnection(
    id: string,
    gitlabUrl: string,
    gitToken: string,
  ): boolean {
    const url = gitlabUrl.trim();
    const token = gitToken.trim();

    if (!url || !token) {
      return false;
    }

    const items = this.connections.map((connection) =>
      connection.id === id
        ? { ...connection, gitlabUrl: url, gitToken: token }
        : connection,
    );

    connectionsKey.value = {
      ...this.snapshot,
      items,
    };

    return true;
  }

  @action
  removeConnection(id: string) {
    const items = this.connections.filter((connection) => connection.id !== id);
    const activeId =
      this.activeId === id ? (items[0]?.id ?? null) : this.activeId;

    connectionsKey.value = {
      items,
      activeId,
    };
  }
}
