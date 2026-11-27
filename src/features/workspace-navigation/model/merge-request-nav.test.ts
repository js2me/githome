import { observable, runInAction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavTreeItem } from '@/shared/lib/navigation/nav-tree';
import {
  createMergeRequestNavItemId,
  MERGE_REQUEST_TAB_LIFETIME,
  MergeRequestNavAdapter,
  pruneOrphanedMergeRequestItems,
} from './merge-request-nav';
import type { Workspace } from './workspace';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', new MemoryStorage());

const { NavTreeStore } = await import('@/shared/lib/navigation/nav-tree');
let store: InstanceType<typeof NavTreeStore>;

const createItem = <Kind extends string, Payload>(
  id: string,
  groupId: string,
  kind: Kind,
  title: string,
  payload: Payload,
): NavTreeItem<Kind, Payload> => ({
  id,
  groupId,
  kind,
  title,
  payload,
});

describe('NavTreeStore', () => {
  let stopNavigation: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new NavTreeStore();
    store.clear();
  });

  afterEach(() => {
    stopNavigation?.();
    stopNavigation = undefined;
    vi.useRealTimers();
    store.clear();
  });

  const createMrNavigation = (iid: number) =>
    new MergeRequestNavAdapter({
      routes: {
        mergeRequest: {
          isOpened: true,
          params: { projectId: '1', mergeRequestIid: String(iid) },
        },
      },
      stores: {
        navTree: store,
        settings: {
          activeId: 'active-connection',
          connections: [{ id: 'active-connection' }],
        },
      },
    } as unknown as Workspace);

  it('starts empty and persists its snapshot', () => {
    expect(store.snapshot).toEqual({ groups: [], items: [] });

    store.upsertGroup({ id: 'repo:1', title: 'group/project' });
    store.upsertItem(
      createItem('mr:1', 'repo:1', 'merge-request', 'Review API', {
        projectId: 1,
        mergeRequestIid: 42,
      }),
    );

    const reloadedStore = new NavTreeStore();
    expect(reloadedStore.snapshot).toEqual(store.snapshot);
    expect(
      JSON.parse(localStorage.getItem('githome:nav-tree') ?? 'null'),
    ).toEqual(store.snapshot);
  });

  it('adds groups and updates an existing group without duplicating it', () => {
    store.upsertGroup({ id: 'repo:1', title: 'group/old-name' });
    store.upsertGroup({ id: 'repo:2', title: 'group/other' });
    store.upsertGroup({ id: 'repo:1', title: 'group/new-name' });

    expect(store.groups).toEqual([
      { id: 'repo:1', title: 'group/new-name' },
      { id: 'repo:2', title: 'group/other' },
    ]);
  });

  it('supports items with different kinds and payloads', () => {
    store.upsertItem(
      createItem('mr:1', 'repo:1', 'merge-request', 'Review API', {
        projectId: 1,
        mergeRequestIid: 42,
      }),
    );
    store.upsertItem(
      createItem('file:1', 'repo:1', 'file', 'package.json', {
        path: 'package.json',
        ref: 'main',
      }),
    );

    expect(store.items).toEqual([
      {
        id: 'mr:1',
        groupId: 'repo:1',
        kind: 'merge-request',
        title: 'Review API',
        payload: { projectId: 1, mergeRequestIid: 42 },
      },
      {
        id: 'file:1',
        groupId: 'repo:1',
        kind: 'file',
        title: 'package.json',
        payload: { path: 'package.json', ref: 'main' },
      },
    ]);
  });

  it('updates an existing item in place instead of adding a duplicate', () => {
    store.upsertItem(
      createItem('item:1', 'group:1', 'merge-request', 'Old title', {
        status: 'open',
      }),
    );
    store.upsertItem(
      createItem('item:2', 'group:1', 'file', 'README', { path: 'README' }),
    );
    store.upsertItem(
      createItem('item:1', 'group:2', 'merge-request', 'Updated title', {
        status: 'merged',
      }),
    );

    expect(store.items).toEqual([
      {
        id: 'item:1',
        groupId: 'group:2',
        kind: 'merge-request',
        title: 'Updated title',
        payload: { status: 'merged' },
      },
      {
        id: 'item:2',
        groupId: 'group:1',
        kind: 'file',
        title: 'README',
        payload: { path: 'README' },
      },
    ]);
  });

  it('removes one item and leaves other items and groups intact', () => {
    store.upsertGroup({ id: 'repo:1', title: 'group/project' });
    store.upsertGroup({ id: 'repo:2', title: 'group/other' });
    store.upsertItem(createItem('item:1', 'repo:1', 'file', 'README', {}));
    store.upsertItem(createItem('item:2', 'repo:2', 'file', 'LICENSE', {}));

    store.removeItem('item:1');

    expect(store.groups).toHaveLength(2);
    expect(store.items.map((item) => item.id)).toEqual(['item:2']);
  });

  it('removes a group and all items that belong to it', () => {
    store.upsertGroup({ id: 'repo:1', title: 'group/project' });
    store.upsertGroup({ id: 'repo:2', title: 'group/other' });
    store.upsertItem(createItem('item:1', 'repo:1', 'file', 'README', {}));
    store.upsertItem(createItem('item:2', 'repo:1', 'merge-request', 'MR', {}));
    store.upsertItem(createItem('item:3', 'repo:2', 'file', 'LICENSE', {}));

    store.removeGroup('repo:1');

    expect(store.groups).toEqual([{ id: 'repo:2', title: 'group/other' }]);
    expect(store.items.map((item) => item.id)).toEqual(['item:3']);
  });

  it('clears all groups and items', () => {
    store.upsertGroup({ id: 'repo:1', title: 'group/project' });
    store.upsertItem(createItem('item:1', 'repo:1', 'file', 'README', {}));

    store.clear();

    expect(store.snapshot).toEqual({ groups: [], items: [] });
  });

  it('keeps the loaded MR and repository titles when restoring an open tab', () => {
    const navigation = createMrNavigation(42);
    navigation.updateDetails('active-connection', 1, 42, {
      title: 'Review API',
      projectPath: 'group/project',
    });
    const snapshot = store.snapshot;

    stopNavigation = navigation.start();

    expect(store.snapshot).toEqual(snapshot);
  });

  it('uses the known repository title for a new MR opened by URL', () => {
    const navigation = createMrNavigation(43);
    navigation.updateDetails('active-connection', 1, 42, {
      title: 'Review API',
      projectPath: 'group/project',
    });

    stopNavigation = navigation.start();

    expect(store.groups).toMatchObject([{ title: 'group/project' }]);
    expect(store.items).toMatchObject([
      { title: 'Review API' },
      {
        title: '',
        payload: { projectPath: 'group/project', mergeRequestIid: 43 },
      },
    ]);
  });

  it('prunes MR items for removed connections without touching other item kinds', () => {
    store.upsertItem(
      createItem('mr:stale', 'repo:stale', 'merge-request', 'Stale MR', {
        connectionId: 'removed-connection',
      }),
    );
    store.upsertItem(
      createItem('mr:active', 'repo:active', 'merge-request', 'Active MR', {
        connectionId: 'active-connection',
      }),
    );
    store.upsertItem(
      createItem('file:1', 'repo:active', 'file', 'README', {
        connectionId: 'removed-connection',
      }),
    );

    pruneOrphanedMergeRequestItems(store, ['active-connection']);

    expect(store.items.map((item) => item.id)).toEqual(['mr:active', 'file:1']);
  });

  it('expires only inactive MR tabs and does not extend their life on a metadata update', () => {
    const navigation = createMrNavigation(42);
    navigation.updateDetails('active-connection', 1, 41, { title: 'Other MR' });
    stopNavigation = navigation.start();
    vi.advanceTimersByTime(MERGE_REQUEST_TAB_LIFETIME - 1);
    navigation.updateDetails('active-connection', 1, 41, {
      title: 'New title',
    });
    expect(store.items).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(store.items.map(({ payload }) => payload)).toMatchObject([
      { mergeRequestIid: 42 },
    ]);
  });

  it('refreshes the expiry timestamp on select and on route navigation', () => {
    const open = vi.fn();
    const route = observable({
      isOpened: false,
      params: { projectId: '1', mergeRequestIid: '42' },
      open,
    });
    const navigation = new MergeRequestNavAdapter({
      routes: { mergeRequest: route },
      stores: {
        navTree: store,
        settings: {
          activeId: 'active-connection',
          connections: [{ id: 'active-connection' }],
        },
      },
    } as unknown as Workspace);
    navigation.updateDetails('active-connection', 1, 42, {
      title: 'Review API',
    });
    stopNavigation = navigation.start();
    vi.advanceTimersByTime(MERGE_REQUEST_TAB_LIFETIME - 1);
    navigation.select(store.items[0]);
    expect(open).toHaveBeenCalledWith({
      projectId: '1',
      mergeRequestIid: '42',
    });
    vi.advanceTimersByTime(MERGE_REQUEST_TAB_LIFETIME - 1);
    expect(store.items).toHaveLength(1);
    runInAction(() => {
      route.isOpened = true;
    });
    runInAction(() => {
      route.isOpened = false;
    });
    vi.advanceTimersByTime(MERGE_REQUEST_TAB_LIFETIME - 1);
    expect(store.items).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(store.items).toHaveLength(0);
  });

  it('drops expired persisted tabs and gives untimestamped tabs two hours after migration', () => {
    const legacyTab = {
      connectionId: 'active-connection',
      projectId: 1,
      projectPath: 'group/repo',
    };
    for (const [mergeRequestIid, lastOpenedAt] of [
      [41, Date.now() - MERGE_REQUEST_TAB_LIFETIME],
      [43, undefined],
    ] as const) {
      const payload = { ...legacyTab, mergeRequestIid, lastOpenedAt };
      store.upsertItem(
        createItem(
          createMergeRequestNavItemId(payload),
          'repository:active-connection:1',
          'merge-request',
          'Older MR',
          payload,
        ),
      );
    }
    const navigation = createMrNavigation(42);
    stopNavigation = navigation.start();
    expect(store.items.map(({ payload }) => payload)).toMatchObject([
      { mergeRequestIid: 43, lastOpenedAt: Date.now() },
      { mergeRequestIid: 42 },
    ]);
    vi.advanceTimersByTime(MERGE_REQUEST_TAB_LIFETIME);
    expect(store.items.map(({ payload }) => payload)).toMatchObject([
      { mergeRequestIid: 42 },
    ]);
  });
});
