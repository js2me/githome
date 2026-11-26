import { QueryObserver } from '@tanstack/query-core';
import { queryClient } from 'mobx-tanstack-query/preset';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RefreshShortcut } from './refresh-shortcut';

const keydown = (options: KeyboardEventInit = {}) =>
  Object.assign(new Event('keydown', { cancelable: true }), {
    code: 'KeyR',
    ctrlKey: true,
    ...options,
  }) as KeyboardEvent;

let shortcut: RefreshShortcut;
let target: EventTarget;
let lifecycle: AbortController;

beforeEach(() => {
  shortcut = new RefreshShortcut();
  target = new EventTarget();
  lifecycle = new AbortController();
  shortcut.connect(target, lifecycle.signal);
});

afterEach(() => {
  lifecycle.abort();
  queryClient.clear();
  vi.useRealTimers();
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
    target.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(shortcut.isVisible).toBe(true);
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
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  }

  const repeat = keydown({ repeat: true });
  target.dispatchEvent(repeat);
  expect(repeat.defaultPrevented).toBe(true);
  expect(refetch).not.toHaveBeenCalled();
  expect(shortcut.isVisible).toBe(false);

  const cmd = keydown({ ctrlKey: false, metaKey: true });
  target.dispatchEvent(cmd);
  expect(cmd.defaultPrevented).toBe(true);
  expect(refetch).toHaveBeenCalledOnce();
});

it('shows the notice for at least a second even if the refresh is instant', async () => {
  vi.useFakeTimers();
  target.dispatchEvent(keydown());

  expect(shortcut.isVisible).toBe(true);
  await vi.advanceTimersByTimeAsync(999);
  expect(shortcut.isVisible).toBe(true);
  await vi.advanceTimersByTimeAsync(1);
  expect(shortcut.isVisible).toBe(false);
});

it('keeps the notice visible until slow queries finish, without starting a second refresh', async () => {
  vi.useFakeTimers();
  const pending = Promise.withResolvers<void>();
  const refetch = vi
    .spyOn(queryClient, 'refetchQueries')
    .mockReturnValue(pending.promise);

  target.dispatchEvent(keydown());
  await vi.advanceTimersByTimeAsync(2_000);
  expect(shortcut.isVisible).toBe(true);
  target.dispatchEvent(keydown());
  expect(refetch).toHaveBeenCalledOnce();

  pending.resolve();
  await pending.promise;
  expect(shortcut.isVisible).toBe(false);
});

it('removes the listener and notice when the layout unmounts', () => {
  const refetch = vi.spyOn(queryClient, 'refetchQueries');
  target.dispatchEvent(keydown());

  lifecycle.abort();
  const event = keydown();
  target.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(shortcut.isVisible).toBe(false);
  expect(refetch).toHaveBeenCalledOnce();
});
