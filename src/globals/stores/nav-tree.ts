import { action, computed, observable } from "mobx";
import { appStorage } from "@/shared/lib/storage";

export interface NavTreeGroup<Kind extends string = string, Payload = unknown> {
  id: string;
  title: string;
  kind?: Kind;
  payload?: Payload;
}

export interface NavTreeItem<Kind extends string = string, Payload = unknown> {
  id: string;
  groupId: string;
  kind: Kind;
  title: string;
  payload: Payload;
}

interface NavTreeSnapshot {
  groups: NavTreeGroup[];
  items: NavTreeItem[];
}

const navTreeKey = appStorage.key<NavTreeSnapshot>("nav-tree", {
  groups: [],
  items: [],
});

export class NavTreeStore {
  @observable accessor isExpanded = false;

  @computed.struct
  get snapshot(): NavTreeSnapshot {
    return navTreeKey.value;
  }

  @computed
  get groups(): NavTreeGroup[] {
    return this.snapshot.groups;
  }

  @computed
  get items(): NavTreeItem[] {
    return this.snapshot.items;
  }

  @action.bound
  upsertGroup<Kind extends string, Payload>(
    group: NavTreeGroup<Kind, Payload>,
  ) {
    const exists = this.groups.some((item) => item.id === group.id);
    navTreeKey.value = {
      ...this.snapshot,
      groups: exists
        ? this.groups.map((item) => (item.id === group.id ? group : item))
        : [...this.groups, group],
    };
  }

  @action.bound
  upsertItem<Kind extends string, Payload>(
    item: NavTreeItem<Kind, Payload>,
  ) {
    const exists = this.items.some((current) => current.id === item.id);
    if (!exists) {
      this.isExpanded = true;
    }

    navTreeKey.value = {
      ...this.snapshot,
      items: exists
        ? this.items.map((current) =>
            current.id === item.id ? item : current,
          )
        : [...this.items, item],
    };
  }

  @action.bound
  removeItem(itemId: string) {
    navTreeKey.value = {
      ...this.snapshot,
      items: this.items.filter((item) => item.id !== itemId),
    };
  }

  @action.bound
  removeGroup(groupId: string) {
    navTreeKey.value = {
      groups: this.groups.filter((group) => group.id !== groupId),
      items: this.items.filter((item) => item.groupId !== groupId),
    };
  }

  @action.bound
  clear() {
    navTreeKey.value = {
      groups: [],
      items: [],
    };
    this.isExpanded = false;
  }

  @action.bound
  expand() {
    this.isExpanded = true;
  }

  @action.bound
  collapse() {
    this.isExpanded = false;
  }
}
