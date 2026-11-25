import { beforeEach, describe, expect, it, vi } from 'vitest';
import { connectionsKey } from '@/shared/lib/storage';
import { SettingsStore } from './settings';

vi.mock('@/shared/lib/storage', () => ({
  connectionsKey: { value: { items: [], activeId: null } },
}));

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
