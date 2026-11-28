import { environmentManager, isServer } from '@tanstack/query-core';
import { queryClient } from 'mobx-tanstack-query/preset';
import { afterEach, expect, it, vi } from 'vitest';
import { createProjectMergeRequestListQuery } from '../merge-requests/list';
import { gitlabRestResourceKey } from './keys';

afterEach(() => {
  queryClient.clear();
  environmentManager.setIsServer(() => isServer);
  vi.unstubAllGlobals();
});

it('paginates GitLab without putting credentials in cache keys', async () => {
  environmentManager.setIsServer(() => false);
  const connection = {
    id: 'account',
    credentialsRevision: 'revision',
    gitlabUrl: 'https://gitlab.example',
    gitToken: 'test-private-token',
  };
  const fetch = vi.fn(async (input: string, init: RequestInit) => {
    const url = new URL(input, 'https://app.example');
    const next = url.searchParams.get('page') === '1';
    expect(url.pathname).toMatch(/\/api\/v4\/projects\/20\/merge_requests$/);
    expect(url.searchParams.get('scope')).toBe('created_by_me');
    expect(url.searchParams.get('iids[]')).toBe('42');
    expect(new Headers(init.headers).get('PRIVATE-TOKEN')).toBe(
      connection.gitToken,
    );
    expect(init.signal).toBeInstanceOf(AbortSignal);
    return Response.json([{ iid: next ? 42 : 43 }], {
      headers: { 'X-Next-Page': next ? '2' : '' },
    });
  });
  vi.stubGlobal('fetch', fetch);
  const controller = new AbortController();

  try {
    const query = createProjectMergeRequestListQuery({
      globals: { stores: { settings: { activeConnection: connection } } },
      params: () => ({ projectId: 20, search: '!42', filter: 'mine' }),
      abortSignal: controller.signal,
    });
    await vi.waitFor(() => expect(query.data?.pages[0].items[0].iid).toBe(42));
    expect(query.hasNextPage).toBe(true);

    await query.fetchNextPage();
    expect(
      query.data?.pages.flatMap((page) => page.items.map((item) => item.iid)),
    ).toEqual([42, 43]);
    expect(query.hasNextPage).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);

    const key = gitlabRestResourceKey(
      connection,
      '/projects/20/merge_requests',
    );
    const matches = queryClient.getQueryCache().findAll({ queryKey: key });
    expect(matches).toHaveLength(1);
    expect(JSON.stringify(matches[0].queryKey)).not.toContain(
      connection.gitToken,
    );
    expect(
      queryClient.getQueryCache().findAll({
        queryKey: gitlabRestResourceKey(
          { ...connection, credentialsRevision: 'rotated' },
          '/projects/20/merge_requests',
        ),
      }),
    ).toHaveLength(0);
  } finally {
    controller.abort();
  }
});
