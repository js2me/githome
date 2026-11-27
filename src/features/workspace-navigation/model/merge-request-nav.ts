import { compareShallow, reaction } from 'mobx';
import type {
  GitLabMergeRequestDC,
  GitLabProjectDC,
} from '@/shared/api/gitlab';
import type {
  NavTreeGroup,
  NavTreeItem,
  NavTreeStore,
} from '@/shared/lib/navigation/nav-tree';
import type { Workspace } from './workspace';

export const MERGE_REQUEST_NAV_KIND = 'merge-request';
export const REPOSITORY_NAV_GROUP_KIND = 'repository';
export const MERGE_REQUEST_TAB_LIFETIME = 2 * 60 * 60 * 1000;

type MergeRequestStatus = Pick<
  GitLabMergeRequestDC,
  'state' | 'draft' | 'work_in_progress' | 'detailed_merge_status'
>;

export interface MergeRequestNavPayload {
  connectionId: string;
  projectId: number;
  projectPath: string;
  mergeRequestIid: number;
  lastOpenedAt?: number;
  status?: MergeRequestStatus;
}

interface RepositoryNavGroupPayload {
  connectionId: string;
  projectId: number;
  personalNamespace?: boolean;
}

export type RepositoryNavGroup = NavTreeGroup<
  typeof REPOSITORY_NAV_GROUP_KIND,
  RepositoryNavGroupPayload
>;

export type MergeRequestNavItem = NavTreeItem<
  typeof MERGE_REQUEST_NAV_KIND,
  MergeRequestNavPayload
>;

export const isMergeRequestNavItem = (
  item: NavTreeItem,
): item is MergeRequestNavItem => item.kind === MERGE_REQUEST_NAV_KIND;

export const pruneOrphanedMergeRequestItems = (
  navTree: Pick<NavTreeStore, 'items' | 'removeItem'>,
  connectionIds: readonly string[],
) => {
  const availableConnections = new Set(connectionIds);
  const orphanedItemIds = navTree.items.flatMap((item) => {
    if (item.kind !== MERGE_REQUEST_NAV_KIND) {
      return [];
    }

    const payload = item.payload as Partial<MergeRequestNavPayload> | null;
    return typeof payload?.connectionId !== 'string' ||
      !availableConnections.has(payload.connectionId)
      ? [item.id]
      : [];
  });

  for (const itemId of orphanedItemIds) {
    navTree.removeItem(itemId);
  }
};

const createGroupId = (connectionId: string, projectId: number) =>
  `repository:${connectionId}:${projectId}`;

export const createMergeRequestNavItemId = (
  payload: Pick<
    MergeRequestNavPayload,
    'connectionId' | 'projectId' | 'mergeRequestIid'
  >,
) =>
  `merge-request:${payload.connectionId}:${payload.projectId}:${payload.mergeRequestIid}`;

export class MergeRequestNavAdapter {
  constructor(private readonly globals: Workspace) {}

  start() {
    const stopRouteSync = reaction(
      () => ({
        isOpened: this.globals.routes.mergeRequest.isOpened,
        projectId: this.globals.routes.mergeRequest.params?.projectId,
        mergeRequestIid:
          this.globals.routes.mergeRequest.params?.mergeRequestIid,
      }),
      () => this.syncCurrentRoute(),
      { equals: compareShallow },
    );
    const stopConnectionSync = reaction(
      () =>
        this.globals.stores.settings.connections.map(
          (connection) => connection.id,
        ),
      (connectionIds) =>
        pruneOrphanedMergeRequestItems(
          this.globals.stores.navTree,
          connectionIds,
        ),
    );

    this.migrateLegacyTabs();
    this.pruneOrphanedItems();
    this.syncCurrentRoute();
    const navTree = this.globals.stores.navTree;
    for (const item of navTree.items) {
      if (
        isMergeRequestNavItem(item) &&
        !Number.isFinite(item.payload.lastOpenedAt)
      ) {
        this.touch(item);
      }
    }

    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleExpiry = () => {
      clearTimeout(expiryTimer);
      const now = Date.now();
      const activeItemId = this.activeItemId;
      const expired = new Set<string>();
      let nextExpiry = Infinity;
      for (const item of navTree.items) {
        if (!isMergeRequestNavItem(item) || item.id === activeItemId) continue;
        const expiresAt =
          (item.payload.lastOpenedAt ?? now) + MERGE_REQUEST_TAB_LIFETIME;
        if (expiresAt <= now) expired.add(item.id);
        else nextExpiry = Math.min(nextExpiry, expiresAt);
      }
      if (Number.isFinite(nextExpiry)) {
        expiryTimer = setTimeout(
          scheduleExpiry,
          Math.min(nextExpiry - now, MERGE_REQUEST_TAB_LIFETIME),
        );
      }
      if (expired.size) navTree.removeItems(expired);
    };
    const stopExpiry = reaction(
      () => [navTree.items, this.activeItemId],
      scheduleExpiry,
      { fireImmediately: true },
    );
    return () => {
      stopRouteSync();
      stopConnectionSync();
      stopExpiry();
      clearTimeout(expiryTimer);
    };
  }

  get activeItemId(): string | null {
    if (!this.globals.routes.mergeRequest.isOpened) {
      return null;
    }

    const connectionId = this.globals.stores.settings.activeId;
    const projectId = Number(
      this.globals.routes.mergeRequest.params?.projectId,
    );
    const mergeRequestIid = Number(
      this.globals.routes.mergeRequest.params?.mergeRequestIid,
    );

    if (
      !connectionId ||
      !Number.isInteger(projectId) ||
      !Number.isInteger(mergeRequestIid)
    ) {
      return null;
    }

    return createMergeRequestNavItemId({
      connectionId,
      projectId,
      mergeRequestIid,
    });
  }

  open(
    connectionId: string,
    project: Pick<GitLabProjectDC, 'id' | 'path_with_namespace' | 'namespace'>,
    mergeRequestIid: number,
    title: string,
  ) {
    const target = { connectionId, projectId: project.id, mergeRequestIid };
    const existing = this.findItem(target);
    const payload: MergeRequestNavPayload = {
      ...existing?.payload,
      ...target,
      projectPath:
        project.path_with_namespace || existing?.payload.projectPath || '',
      lastOpenedAt: Date.now(),
    };

    this.upsertItem(payload, title, project.namespace?.kind);
    this.navigate(payload);
  }

  updateDetails(
    connectionId: string,
    projectId: number,
    mergeRequestIid: number,
    details: {
      title: string;
      projectPath?: string;
      namespaceKind?: NonNullable<GitLabProjectDC['namespace']>['kind'];
      status?: MergeRequestStatus;
    },
  ) {
    const target = { connectionId, projectId, mergeRequestIid };
    const existing = this.findItem(target);
    this.upsertItem(
      {
        ...existing?.payload,
        ...target,
        projectPath: details.projectPath || existing?.payload.projectPath || '',
        status: details.status ?? existing?.payload.status,
        lastOpenedAt: existing?.payload.lastOpenedAt ?? Date.now(),
      },
      details.title || existing?.title || '',
      details.namespaceKind,
    );
  }

  select(item: NavTreeItem) {
    if (!isMergeRequestNavItem(item)) return;
    this.touch(item);
    this.navigate(item.payload);
  }

  selectGroup(group: RepositoryNavGroup) {
    const { connectionId, projectId } = group.payload ?? {};
    if (
      typeof connectionId !== 'string' ||
      !Number.isInteger(projectId) ||
      !this.globals.stores.settings.connections.some(
        (connection) => connection.id === connectionId,
      )
    ) {
      return;
    }

    if (this.globals.stores.settings.activeId !== connectionId) {
      this.globals.stores.settings.setActiveConnection(connectionId);
    }
    void this.globals.routes.repository.open({
      projectId: String(projectId),
    });
  }

  selectNamespace(connectionId: string, groupPath: string) {
    const { settings } = this.globals.stores;
    if (!settings.connections.some(({ id }) => id === connectionId)) return;
    if (settings.activeId !== connectionId)
      settings.setActiveConnection(connectionId);
    void this.globals.routes.group.open({ groupPath });
  }

  close(item: NavTreeItem) {
    if (!isMergeRequestNavItem(item)) {
      return;
    }

    const mergeRequestItem = item;
    const mergeRequestItems = this.globals.stores.navTree.items.filter(
      isMergeRequestNavItem,
    );
    const index = mergeRequestItems.findIndex(
      (navItem) => navItem.id === mergeRequestItem.id,
    );
    const wasActive = this.activeItemId === mergeRequestItem.id;

    this.globals.stores.navTree.removeItem(mergeRequestItem.id);

    if (!wasActive || index < 0) {
      return;
    }

    const remainingItems = mergeRequestItems.filter(
      (navItem) => navItem.id !== mergeRequestItem.id,
    );
    const nextItem = remainingItems[index] ?? remainingItems[index - 1];

    if (nextItem) {
      this.touch(nextItem);
      this.navigate(nextItem.payload);
      return;
    }

    if (
      !this.globals.stores.settings.connections.some(
        (connection) => connection.id === mergeRequestItem.payload.connectionId,
      )
    ) {
      return;
    }

    if (
      this.globals.stores.settings.activeId !==
      mergeRequestItem.payload.connectionId
    ) {
      this.globals.stores.settings.setActiveConnection(
        mergeRequestItem.payload.connectionId,
      );
    }
    void this.globals.routes.mergeRequests.open({
      projectId: String(mergeRequestItem.payload.projectId),
    });
  }

  private syncCurrentRoute() {
    const connectionId = this.globals.stores.settings.activeId;
    const projectId = Number(
      this.globals.routes.mergeRequest.params?.projectId,
    );
    const mergeRequestIid = Number(
      this.globals.routes.mergeRequest.params?.mergeRequestIid,
    );

    if (
      !this.globals.routes.mergeRequest.isOpened ||
      !connectionId ||
      !Number.isInteger(projectId) ||
      !Number.isInteger(mergeRequestIid)
    ) {
      return;
    }

    const navTree = this.globals.stores.navTree;
    const tab = { connectionId, projectId, mergeRequestIid };
    const item = this.findItem(tab);
    if (item) {
      this.touch(item);
      return;
    }

    const groupId = createGroupId(connectionId, projectId);
    const projectPath = navTree.groups.find(
      (group) => group.id === groupId,
    )?.title;
    this.upsertItem(
      {
        ...tab,
        projectPath: projectPath ?? '',
        lastOpenedAt: Date.now(),
      },
      '',
    );
  }

  private pruneOrphanedItems() {
    pruneOrphanedMergeRequestItems(
      this.globals.stores.navTree,
      this.globals.stores.settings.connections.map(
        (connection) => connection.id,
      ),
    );
  }

  private findItem(
    target: Pick<
      MergeRequestNavPayload,
      'connectionId' | 'projectId' | 'mergeRequestIid'
    >,
  ) {
    const id = createMergeRequestNavItemId(target);
    return this.globals.stores.navTree.items.find(
      (item): item is MergeRequestNavItem =>
        item.id === id && isMergeRequestNavItem(item),
    );
  }

  private touch(item: MergeRequestNavItem) {
    const lastOpenedAt = Date.now();
    if (item.payload.lastOpenedAt !== lastOpenedAt) {
      this.globals.stores.navTree.upsertItem({
        ...item,
        payload: { ...item.payload, lastOpenedAt },
      });
    }
  }

  private upsertItem(
    payload: MergeRequestNavPayload,
    title: string,
    namespaceKind?: NonNullable<GitLabProjectDC['namespace']>['kind'],
  ) {
    const groupId = createGroupId(payload.connectionId, payload.projectId);
    const existing = this.globals.stores.navTree.groups.find(
      (group) => group.id === groupId,
    ) as RepositoryNavGroup | undefined;
    this.globals.stores.navTree.upsertGroup<
      typeof REPOSITORY_NAV_GROUP_KIND,
      RepositoryNavGroupPayload
    >({
      id: groupId,
      title: payload.projectPath,
      kind: REPOSITORY_NAV_GROUP_KIND,
      payload: {
        connectionId: payload.connectionId,
        projectId: payload.projectId,
        personalNamespace:
          namespaceKind == null
            ? existing?.payload?.personalNamespace
            : namespaceKind === 'user',
      },
    });
    this.globals.stores.navTree.upsertItem<
      typeof MERGE_REQUEST_NAV_KIND,
      MergeRequestNavPayload
    >({
      id: createMergeRequestNavItemId(payload),
      groupId,
      kind: MERGE_REQUEST_NAV_KIND,
      title,
      payload,
    });
  }

  private navigate(payload: MergeRequestNavPayload) {
    const connectionExists = this.globals.stores.settings.connections.some(
      (connection) => connection.id === payload.connectionId,
    );
    if (!connectionExists) {
      this.globals.stores.navTree.removeItem(
        createMergeRequestNavItemId(payload),
      );
      return;
    }

    if (this.globals.stores.settings.activeId !== payload.connectionId) {
      this.globals.stores.settings.setActiveConnection(payload.connectionId);
    }

    void this.globals.routes.mergeRequest.open({
      projectId: String(payload.projectId),
      mergeRequestIid: String(payload.mergeRequestIid),
    });
  }

  private migrateLegacyTabs() {
    const legacyStorageKey = 'githome:open-merge-request-tabs';
    try {
      const raw = localStorage.getItem(legacyStorageKey);
      if (!raw) {
        return;
      }

      const legacyTabs = JSON.parse(raw) as Array<{
        connectionId: string;
        projectId: number;
        projectPath: string;
        mergeRequestIid: number;
        title: string;
      }>;

      for (const tab of legacyTabs) {
        if (
          !tab.connectionId ||
          !Number.isInteger(tab.projectId) ||
          !Number.isInteger(tab.mergeRequestIid)
        ) {
          continue;
        }

        const payload: MergeRequestNavPayload = {
          connectionId: tab.connectionId,
          projectId: tab.projectId,
          projectPath: tab.projectPath || '',
          mergeRequestIid: tab.mergeRequestIid,
        };
        const itemId = createMergeRequestNavItemId(payload);
        if (
          this.globals.stores.navTree.items.some((item) => item.id === itemId)
        ) {
          continue;
        }

        this.upsertItem(payload, tab.title);
      }

      localStorage.removeItem(legacyStorageKey);
    } catch {
      // Ignore invalid legacy storage and leave it untouched for inspection.
    }
  }
}
