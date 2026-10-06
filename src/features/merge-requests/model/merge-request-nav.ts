import { reaction } from "mobx";
import type { Globals } from "@/globals";
import type {
  NavTreeGroup,
  NavTreeItem,
  NavTreeStore,
} from "@/globals/stores/nav-tree";
import type { GitLabProjectDC } from "@/shared/api/gitlab";

export const MERGE_REQUEST_NAV_KIND = "merge-request";
export const REPOSITORY_NAV_GROUP_KIND = "repository";

export interface MergeRequestNavPayload {
  connectionId: string;
  projectId: number;
  projectPath: string;
  mergeRequestIid: number;
}

interface RepositoryNavGroupPayload {
  connectionId: string;
  projectId: number;
}

type RepositoryNavGroup = NavTreeGroup<
  typeof REPOSITORY_NAV_GROUP_KIND,
  RepositoryNavGroupPayload
>;

export type MergeRequestNavItem = NavTreeItem<
  typeof MERGE_REQUEST_NAV_KIND,
  MergeRequestNavPayload
>;

export const pruneOrphanedMergeRequestItems = (
  navTree: Pick<NavTreeStore, "items" | "removeItem">,
  connectionIds: readonly string[],
) => {
  const availableConnections = new Set(connectionIds);
  const orphanedItemIds = navTree.items.flatMap((item) => {
    if (item.kind !== MERGE_REQUEST_NAV_KIND) {
      return [];
    }

    const payload = item.payload as Partial<MergeRequestNavPayload> | null;
    return typeof payload?.connectionId !== "string" ||
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
    "connectionId" | "projectId" | "mergeRequestIid"
  >,
) =>
  `merge-request:${payload.connectionId}:${payload.projectId}:${payload.mergeRequestIid}`;

export class MergeRequestNavAdapter {
  constructor(private readonly globals: Globals) {}

  start() {
    reaction(
      () => ({
        isOpened: this.globals.routes.mergeRequest.isOpened,
        projectId: this.globals.routes.mergeRequest.params?.projectId,
        mergeRequestIid:
          this.globals.routes.mergeRequest.params?.mergeRequestIid,
      }),
      () => this.syncCurrentRoute(),
    );
    reaction(
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
    project: Pick<GitLabProjectDC, "id" | "path_with_namespace">,
    mergeRequestIid: number,
    title: string,
  ) {
    const payload: MergeRequestNavPayload = {
      connectionId,
      projectId: project.id,
      projectPath: project.path_with_namespace,
      mergeRequestIid,
    };

    this.globals.stores.navTree.expand();
    this.upsertItem(payload, title);
    this.navigate(payload);
  }

  updateDetails(
    connectionId: string,
    projectId: number,
    mergeRequestIid: number,
    details: { title: string; projectPath?: string },
  ) {
    const existing = this.globals.stores.navTree.items.find(
      (item) =>
        item.id ===
        createMergeRequestNavItemId({
          connectionId,
          projectId,
          mergeRequestIid,
        }),
    ) as MergeRequestNavItem | undefined;

    this.upsertItem(
      {
        connectionId,
        projectId,
        projectPath:
          details.projectPath ??
          existing?.payload.projectPath ??
          "Загрузка репозитория…",
        mergeRequestIid,
      },
      details.title || existing?.title || "Merge Request",
    );
  }

  select(item: NavTreeItem) {
    if (item.kind !== MERGE_REQUEST_NAV_KIND) {
      return;
    }

    const mergeRequestItem = item as MergeRequestNavItem;
    this.navigate(mergeRequestItem.payload);
  }

  selectGroup(group: NavTreeGroup) {
    if (group.kind !== REPOSITORY_NAV_GROUP_KIND) {
      return;
    }

    const repositoryGroup = group as RepositoryNavGroup;
    const { connectionId, projectId } = repositoryGroup.payload ?? {};
    if (
      typeof connectionId !== "string" ||
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

  close(item: NavTreeItem) {
    if (item.kind !== MERGE_REQUEST_NAV_KIND) {
      return;
    }

    const mergeRequestItem = item as MergeRequestNavItem;
    const mergeRequestItems = this.globals.stores.navTree.items.filter(
      (navItem): navItem is MergeRequestNavItem =>
        navItem.kind === MERGE_REQUEST_NAV_KIND,
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
      this.navigate(nextItem.payload);
      return;
    }

    if (
      !this.globals.stores.settings.connections.some(
        (connection) =>
          connection.id === mergeRequestItem.payload.connectionId,
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

    this.globals.stores.navTree.expand();
    this.upsertItem(
      {
        connectionId,
        projectId,
        projectPath: "Загрузка репозитория…",
        mergeRequestIid,
      },
      "Merge Request",
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

  private upsertItem(payload: MergeRequestNavPayload, title: string) {
    const groupId = createGroupId(payload.connectionId, payload.projectId);
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
    const legacyStorageKey = "githome:open-merge-request-tabs";
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
          projectPath: tab.projectPath || "Загрузка репозитория…",
          mergeRequestIid: tab.mergeRequestIid,
        };
        const itemId = createMergeRequestNavItemId(payload);
        if (this.globals.stores.navTree.items.some((item) => item.id === itemId)) {
          continue;
        }

        this.upsertItem(
          payload,
          tab.title,
        );
      }

      localStorage.removeItem(legacyStorageKey);
    } catch {
      // Ignore invalid legacy storage and leave it untouched for inspection.
    }
  }
}
