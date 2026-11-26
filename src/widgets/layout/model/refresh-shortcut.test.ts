import { QueryObserver } from '@tanstack/query-core';
import { queryClient } from 'mobx-tanstack-query/preset';
import { afterEach, expect, it, vi } from 'vitest';
import { handleRefreshShortcut } from './refresh-shortcut';

const keydown = (options: KeyboardEventInit = {}) =>
  Object.assign(new Event('keydown', { cancelable: true }), {
    code: 'KeyR',
    ctrlKey: true,
    ...options,
  }) as KeyboardEvent;

afterEach(() => {
  queryClient.clear();
  vi.restoreAllMocks();
});

it('refreshes all active queries, including fresh ones, without reloading', async () => {
  const options = (key: string) => ({
    queryKey: [key],
    queryFn: vi.fn(async () => 'refreshed'),
    initialData: 'cached',
    staleTime: Infinity,
  });
  const active = [options('first'), options('second')];
  const inactive = options('inactive');
  const disabled = { ...options('disabled'), enabled: false };
  const unsubscribe = [...active, inactive, disabled].map((queryOptions) =>
    new QueryObserver(queryClient, queryOptions).subscribe(() => {}),
  );
  unsubscribe[2]();

  try {
    const event = keydown();
    handleRefreshShortcut(event);

    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() => {
      for (const { queryKey } of active) {
        expect(queryClient.getQueryData(queryKey)).toBe('refreshed');
      }
    });
    expect(inactive.queryFn).not.toHaveBeenCalled();
    expect(disabled.queryFn).not.toHaveBeenCalled();
  } finally {
    for (const dispose of unsubscribe) dispose();
  }
});

it('supports Cmd+R, preserves other shortcuts, and ignores key repeats', () => {
  const refetch = vi.spyOn(queryClient, 'refetchQueries');
  for (const options of [
    { ctrlKey: false },
    { shiftKey: true },
    { altKey: true },
    { code: 'KeyK' },
    { isComposing: true },
  ]) {
    const event = keydown(options);
    handleRefreshShortcut(event);
    expect(event.defaultPrevented).toBe(false);
  }

  const repeat = keydown({ repeat: true });
  handleRefreshShortcut(repeat);
  expect(repeat.defaultPrevented).toBe(true);
  expect(refetch).not.toHaveBeenCalled();

  const cmd = keydown({ ctrlKey: false, metaKey: true });
  handleRefreshShortcut(cmd);
  expect(cmd.defaultPrevented).toBe(true);
  expect(refetch).toHaveBeenCalledOnce();
});
