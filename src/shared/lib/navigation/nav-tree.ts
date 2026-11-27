import { actionBound, computed, computedStruct } from 'mobx';
import { appStorage } from '@/shared/lib/storage';

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

const navTreeKey = appStorage.key<NavTreeSnapshot>('nav-tree', {
  groups: [],
  items: [],
});

export class NavTreeStore {
  @computedStruct
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

  @actionBound
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

  @actionBound
  upsertItem<Kind extends string, Payload>(item: NavTreeItem<Kind, Payload>) {
    const exists = this.items.some((current) => current.id === item.id);
    navTreeKey.value = {
      ...this.snapshot,
      items: exists
        ? this.items.map((current) => (current.id === item.id ? item : current))
        : [...this.items, item],
    };
  }

  @actionBound
  removeItem(itemId: string) {
    this.removeItems(new Set([itemId]));
  }

  @actionBound
  removeItems(itemIds: ReadonlySet<string>) {
    navTreeKey.value = {
      ...this.snapshot,
      items: this.items.filter((item) => !itemIds.has(item.id)),
    };
  }

  @actionBound
  removeGroup(groupId: string) {
    navTreeKey.value = {
      groups: this.groups.filter((group) => group.id !== groupId),
      items: this.items.filter((item) => item.groupId !== groupId),
    };
  }

  @actionBound
  clear() {
    navTreeKey.value = {
      groups: [],
      items: [],
    };
  }
}
