import { action, computed, computedStruct } from 'mobx';
import { bindForgeAccount } from '@/shared/api/forge/adapter';
import {
  type CloudCredentials,
  type ForgeConnection,
  parseCloudCredentials,
} from '@/shared/api/forge/connection';
import {
  type GitLabConnection,
  getConnectionLabel,
  parseConnectionDraft,
} from '@/shared/lib/gitlab/connection/connection';
import {
  type ConnectionsStorage,
  connectionsKey,
  type GitLabConnectionItem,
} from '@/shared/lib/storage';

export class SettingsStore {
  @computedStruct
  get snapshot(): ConnectionsStorage {
    return connectionsKey.value;
  }

  @computed
  get connections(): GitLabConnectionItem[] {
    return this.snapshot.items.filter(
      (item): item is GitLabConnectionItem => item.gitlabUrl !== undefined,
    );
  }

  // Existing GitLab routes, tabs and cached projects must never use a cloud account ID.
  @computed
  get activeId(): string | null {
    return this.activeConnection?.id ?? null;
  }

  @computed
  get allConnections(): ForgeConnection[] {
    return this.snapshot.items;
  }

  @computedStruct
  get activeForgeItem(): ForgeConnection | null {
    const { activeId, items } = this.snapshot;
    return items.find((connection) => connection.id === activeId) ?? null;
  }

  private readonly selectedSession = computed(
    () => {
      const item = this.activeForgeItem;
      return item ? bindForgeAccount(item) : null;
    },
    { keepAlive: true },
  );

  get activeSession() {
    return this.selectedSession.get();
  }

  get activeConnection(): GitLabConnection | null {
    return this.activeSession?.gitlabConnection ?? null;
  }

  @computed
  get connectionOptions() {
    const labels = this.allConnections.map((item) => ({
      id: item.id,
      host:
        item.gitlabUrl !== undefined
          ? getConnectionLabel(item.gitlabUrl)
          : item.workspace
            ? `Bitbucket · ${item.workspace}`
            : 'GitHub',
    }));
    const totals = new Map<string, number>();
    const sequence = new Map<string, number>();
    for (const { host } of labels)
      totals.set(host, (totals.get(host) ?? 0) + 1);
    return labels.map(({ id, host }) => {
      const number = (sequence.get(host) ?? 0) + 1;
      sequence.set(host, number);
      return {
        id,
        label: (totals.get(host) ?? 0) > 1 ? `${host} · ${number}` : host,
      };
    });
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
      items: [...this.allConnections, item],
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
    const updated = { ...connection, ...draft, credentialsRevision };
    const items = this.allConnections.map((item) =>
      item.id === id ? updated : item,
    );

    connectionsKey.value = {
      ...this.snapshot,
      items,
    };

    return true;
  }

  @action
  saveCloudConnection(input: CloudCredentials, id?: string): boolean {
    const draft = parseCloudCredentials(input);
    if (!draft) return false;
    if (!id) {
      const item = { ...draft, id: crypto.randomUUID() };
      connectionsKey.value = {
        activeId: item.id,
        items: [...this.allConnections, item],
      };
      return true;
    }

    const current = this.allConnections.find((item) => item.id === id);
    if (!current || current.provider !== draft.provider) return false;
    const changed =
      current.gitToken !== draft.gitToken ||
      current.email !== draft.email ||
      current.workspace !== draft.workspace;

    connectionsKey.value = {
      ...this.snapshot,
      items: this.allConnections.map((item) =>
        item.id === id
          ? {
              ...draft,
              id,
              credentialsRevision: changed
                ? crypto.randomUUID()
                : current.credentialsRevision,
            }
          : item,
      ),
    };
    return true;
  }

  @action
  removeConnection(id: string) {
    const items = this.allConnections.filter(
      (connection) => connection.id !== id,
    );
    const current = this.snapshot.activeId;
    const activeId = current === id ? (items[0]?.id ?? null) : current;

    connectionsKey.value = {
      items,
      activeId,
    };
  }
}
