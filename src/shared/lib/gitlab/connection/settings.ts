import { action, computed, computedStruct } from 'mobx';
import {
  type GitLabConnection,
  normalizeJiraBaseUrl,
  parseConnectionDraft,
} from '@/shared/lib/gitlab/connection/connection';
import {
  type ConnectionsStorage,
  connectionsKey,
  type GitLabConnectionItem,
} from '@/shared/lib/storage';

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
    credentialsRevision: item.credentialsRevision,
    jiraUrl: normalizeJiraBaseUrl(item.jiraUrl),
  };
};

export class SettingsStore {
  @computedStruct
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
  addConnection(
    gitlabUrl: string,
    gitToken: string,
    jiraUrl?: string,
  ): string | null {
    const draft = parseConnectionDraft(gitlabUrl, gitToken, jiraUrl);
    if (!draft) return null;

    const item = { id: crypto.randomUUID(), ...draft };
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
    jiraUrl?: string,
  ): boolean {
    const connection = this.connections.find((item) => item.id === id);
    if (!connection) return false;

    const draft = parseConnectionDraft(
      gitlabUrl,
      gitToken,
      jiraUrl ?? connection.jiraUrl,
    );
    if (!draft) return false;
    const credentialsChanged =
      draft.gitlabUrl !== connection.gitlabUrl ||
      draft.gitToken !== connection.gitToken;
    const credentialsRevision = credentialsChanged
      ? crypto.randomUUID()
      : connection.credentialsRevision;
    const items = this.connections.map((item) =>
      item.id === id ? { ...item, ...draft, credentialsRevision } : item,
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
