import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as forge from '@/shared/api/forge/adapter';
import { type ConnectionsStorage, connectionsKey } from '@/shared/lib/storage';
import { SettingsStore } from './settings';

vi.mock('@/shared/lib/storage', async () => {
  const { observable, runInAction } = await import('mobx');
  const snapshot = observable.box<ConnectionsStorage>(
    { items: [], activeId: null },
    { deep: false },
  );
  return {
    connectionsKey: {
      get value() {
        return snapshot.get();
      },
      set value(value: ConnectionsStorage) {
        runInAction(() => snapshot.set(value));
      },
    },
  };
});

const existing = {
  id: 'old',
  gitlabUrl: 'https://gitlab.example',
  gitToken: 'test',
};

describe('GitLab connection settings', () => {
  const store = new SettingsStore();

  beforeEach(() => {
    connectionsKey.value = { items: [existing], activeId: existing.id };
  });

  it('keeps old connections usable and allows adding and clearing their Jira address', () => {
    expect(store.activeConnection?.id).toBe(existing.id);
    expect(store.activeConnection?.jiraUrl).toBeUndefined();

    const update = (jiraUrl: string) =>
      store.updateConnection(
        existing.id,
        existing.gitlabUrl,
        existing.gitToken,
        jiraUrl,
      );
    expect(
      update(' https://tools.example:8443/work/jira/?welcome=1#start '),
    ).toBe(true);
    expect(store.activeConnection?.jiraUrl).toBe(
      'https://tools.example:8443/work/jira',
    );
    expect(update(' ')).toBe(true);
    expect(store.activeConnection?.jiraUrl).toBeUndefined();
  });

  it('associates each address with its own connection', () => {
    const newId = store.addConnection(
      'https://other.example',
      'test',
      'http://jira.local/',
    );
    expect(store.activeConnection?.id).toBe(newId);
    expect(store.activeConnection?.jiraUrl).toBe('http://jira.local');
    store.setActiveConnection(existing.id);
    expect(store.activeConnection?.jiraUrl).toBeUndefined();
  });

  it('rotates the profile cache key when the token or GitLab address changes', () => {
    store.updateConnection(existing.id, existing.gitlabUrl, 'updated-token');
    const revision = store.activeConnection?.credentialsRevision;
    expect(revision).toBeTruthy();
    expect(revision).not.toBe('updated-token');

    store.updateConnection(
      existing.id,
      existing.gitlabUrl,
      'updated-token',
      'https://jira.example',
    );
    expect(store.activeConnection?.credentialsRevision).toBe(revision);
    store.updateConnection(
      existing.id,
      'https://other.example',
      'updated-token',
    );
    expect(store.activeConnection?.credentialsRevision).not.toBe(revision);
  });

  it.each([
    'jira.example',
    '/jira',
    '//jira.example',
    'ftp://jira.example',
    'https://user:password@jira.example',
    'https://',
  ])(
    'rejects an invalid address without updating the connection (%s)',
    (jiraUrl) => {
      expect(
        store.updateConnection(
          existing.id,
          existing.gitlabUrl,
          existing.gitToken,
          jiraUrl,
        ),
      ).toBe(false);
      expect(connectionsKey.value.items).toEqual([existing]);
    },
  );
});

it('coexists with legacy GitLab connections and rotates Bitbucket credentials on workspace changes', () => {
  connectionsKey.value = { items: [existing], activeId: existing.id };
  const store = new SettingsStore();
  const draft = {
    provider: 'bitbucket' as const,
    gitToken: 'test-token',
    email: 'user@example.com',
    workspace: 'team-a',
  };
  expect(store.saveCloudConnection(draft)).toBe(true);
  expect(store.activeConnection).toBeNull();
  expect(store.activeId).toBeNull();
  expect(store.connections).toEqual([existing]);
  expect(store.activeForgeItem?.provider).toBe('bitbucket');
  expect(store.allConnections).toHaveLength(2);
  const id = store.activeForgeItem?.id;
  expect(id).toBeDefined();

  expect(store.saveCloudConnection({ ...draft, workspace: 'team-b' }, id)).toBe(
    true,
  );
  expect(store.activeForgeItem?.credentialsRevision).toBeTruthy();
  store.setActiveConnection(existing.id);
  expect(store.activeConnection?.id).toBe(existing.id);
  expect(store.allConnections).toHaveLength(2);
});

it('binds only the selected account and reuses its adapter until credentials change', () => {
  const github = {
    id: 'github',
    provider: 'github' as const,
    gitToken: 'first',
  };
  connectionsKey.value = { activeId: existing.id, items: [existing, github] };
  const bind = vi.spyOn(forge, 'bindForgeAccount');
  const store = new SettingsStore();
  try {
    expect(store.connectionOptions).toHaveLength(2);
    expect(bind).not.toHaveBeenCalled();
    const gitlab = store.activeSession;
    expect(gitlab?.provider).toBe('gitlab');
    expect(store.activeConnection).toBe(gitlab?.gitlabConnection);
    expect(store.activeSession).toBe(gitlab);
    store.setActiveConnection(existing.id);
    expect(store.activeSession).toBe(gitlab);
    expect(bind).toHaveBeenCalledTimes(1);

    store.setActiveConnection(github.id);
    const active = store.activeSession;
    expect(active?.provider).toBe('github');
    expect(store.activeConnection).toBeNull();
    expect(store.activeSession).toBe(active);
    store.updateConnection(
      existing.id,
      existing.gitlabUrl,
      'inactive-new-token',
    );
    expect(store.activeSession).toBe(active);
    expect(bind).toHaveBeenCalledTimes(2);

    store.saveCloudConnection(
      { provider: 'github', gitToken: 'second' },
      github.id,
    );
    expect(store.activeSession?.adapter).not.toBe(active?.adapter);
    expect(bind).toHaveBeenCalledTimes(3);
  } finally {
    bind.mockRestore();
  }
});
