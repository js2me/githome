import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pruneOrphanedMergeRequestItems } from "@/features/merge-requests/model/merge-request-nav";
import type { NavTreeItem } from "./nav-tree";

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

vi.stubGlobal("window", {});
vi.stubGlobal("localStorage", new MemoryStorage());

const { NavTreeStore } = await import("./nav-tree");
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

describe("NavTreeStore", () => {
  beforeEach(() => {
    store = new NavTreeStore();
    store.clear();
  });

  afterEach(() => {
    store.clear();
  });

  it("starts empty and persists its snapshot", () => {
    expect(store.snapshot).toEqual({ groups: [], items: [] });

    store.upsertGroup({ id: "repo:1", title: "group/project" });
    store.upsertItem(
      createItem("mr:1", "repo:1", "merge-request", "Review API", {
        projectId: 1,
        mergeRequestIid: 42,
      }),
    );

    const reloadedStore = new NavTreeStore();
    expect(reloadedStore.snapshot).toEqual(store.snapshot);
    expect(JSON.parse(localStorage.getItem("githome:nav-tree") ?? "null")).toEqual(
      store.snapshot,
    );
  });

  it("adds groups and updates an existing group without duplicating it", () => {
    store.upsertGroup({ id: "repo:1", title: "group/old-name" });
    store.upsertGroup({ id: "repo:2", title: "group/other" });
    store.upsertGroup({ id: "repo:1", title: "group/new-name" });

    expect(store.groups).toEqual([
      { id: "repo:1", title: "group/new-name" },
      { id: "repo:2", title: "group/other" },
    ]);
  });

  it("supports items with different kinds and payloads", () => {
    store.upsertItem(
      createItem("mr:1", "repo:1", "merge-request", "Review API", {
        projectId: 1,
        mergeRequestIid: 42,
      }),
    );
    store.upsertItem(
      createItem("file:1", "repo:1", "file", "package.json", {
        path: "package.json",
        ref: "main",
      }),
    );

    expect(store.items).toEqual([
      {
        id: "mr:1",
        groupId: "repo:1",
        kind: "merge-request",
        title: "Review API",
        payload: { projectId: 1, mergeRequestIid: 42 },
      },
      {
        id: "file:1",
        groupId: "repo:1",
        kind: "file",
        title: "package.json",
        payload: { path: "package.json", ref: "main" },
      },
    ]);
  });

  it("updates an existing item in place instead of adding a duplicate", () => {
    store.upsertItem(
      createItem("item:1", "group:1", "merge-request", "Old title", {
        status: "open",
      }),
    );
    store.upsertItem(
      createItem("item:2", "group:1", "file", "README", { path: "README" }),
    );
    store.upsertItem(
      createItem("item:1", "group:2", "merge-request", "Updated title", {
        status: "merged",
      }),
    );

    expect(store.items).toEqual([
      {
        id: "item:1",
        groupId: "group:2",
        kind: "merge-request",
        title: "Updated title",
        payload: { status: "merged" },
      },
      {
        id: "item:2",
        groupId: "group:1",
        kind: "file",
        title: "README",
        payload: { path: "README" },
      },
    ]);
  });

  it("removes one item and leaves other items and groups intact", () => {
    store.upsertGroup({ id: "repo:1", title: "group/project" });
    store.upsertGroup({ id: "repo:2", title: "group/other" });
    store.upsertItem(createItem("item:1", "repo:1", "file", "README", {}));
    store.upsertItem(createItem("item:2", "repo:2", "file", "LICENSE", {}));

    store.removeItem("item:1");

    expect(store.groups).toHaveLength(2);
    expect(store.items.map((item) => item.id)).toEqual(["item:2"]);
  });

  it("removes a group and all items that belong to it", () => {
    store.upsertGroup({ id: "repo:1", title: "group/project" });
    store.upsertGroup({ id: "repo:2", title: "group/other" });
    store.upsertItem(createItem("item:1", "repo:1", "file", "README", {}));
    store.upsertItem(createItem("item:2", "repo:1", "merge-request", "MR", {}));
    store.upsertItem(createItem("item:3", "repo:2", "file", "LICENSE", {}));

    store.removeGroup("repo:1");

    expect(store.groups).toEqual([{ id: "repo:2", title: "group/other" }]);
    expect(store.items.map((item) => item.id)).toEqual(["item:3"]);
  });

  it("clears all groups and items", () => {
    store.upsertGroup({ id: "repo:1", title: "group/project" });
    store.upsertItem(createItem("item:1", "repo:1", "file", "README", {}));

    store.clear();

    expect(store.snapshot).toEqual({ groups: [], items: [] });
  });

  it("prunes MR items for removed connections without touching other item kinds", () => {
    store.upsertItem(
      createItem("mr:stale", "repo:stale", "merge-request", "Stale MR", {
        connectionId: "removed-connection",
      }),
    );
    store.upsertItem(
      createItem("mr:active", "repo:active", "merge-request", "Active MR", {
        connectionId: "active-connection",
      }),
    );
    store.upsertItem(
      createItem("file:1", "repo:active", "file", "README", {
        connectionId: "removed-connection",
      }),
    );

    pruneOrphanedMergeRequestItems(store, ["active-connection"]);

    expect(store.items.map((item) => item.id)).toEqual(["mr:active", "file:1"]);
  });
});
