import { createStorageData } from 'mobx-web-api';

import type { ForgeConnection } from '@/shared/api/forge/connection';

export type { GitLabConnectionItem } from '@/shared/api/forge/connection';

export interface ConnectionsStorage {
  items: ForgeConnection[];
  activeId: string | null;
}

export const appStorage = createStorageData({ prefix: 'githome:' });

export const connectionsKey = appStorage.key<ConnectionsStorage>(
  'connections',
  {
    items: [],
    activeId: null,
  },
);

const migrateLegacySettings = () => {
  if (connectionsKey.value.items.length > 0) {
    return;
  }

  try {
    const raw = localStorage.getItem('githome:settings');
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Partial<{
      gitToken: string;
      gitlabUrl: string;
    }>;

    const gitToken = parsed.gitToken?.trim();
    const gitlabUrl = parsed.gitlabUrl?.trim();

    if (!gitToken || !gitlabUrl) {
      return;
    }

    const id = crypto.randomUUID();
    connectionsKey.value = {
      items: [{ id, provider: 'gitlab', gitlabUrl, gitToken }],
      activeId: id,
    };

    localStorage.removeItem('githome:settings');
  } catch {
    // ignore invalid legacy payload
  }
};

migrateLegacySettings();
