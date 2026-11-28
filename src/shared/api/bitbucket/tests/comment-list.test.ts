import { expect, it } from 'vitest';
import { CloudRequestError } from '../../forge/cloud-client';
import { listGeneralComments } from '../comment-list';

const ref = { repositoryId: 'team/demo', number: 7 };
const path = '/2.0/repositories/team/demo/pullrequests/7/comments';
const signal = new AbortController().signal;

it('excludes whole inline threads across pages without dropping general replies', async () => {
  const next = `https://api.bitbucket.org${path}?page=2`;
  const responses: Record<string, object> = {
    [`${path}?pagelen=30`]: {
      values: [
        { id: 1 },
        { id: 2, inline: { path: 'src/file.ts', to: 3 } },
        { id: 3, parent: { id: 2 } },
        { id: 4, parent: { id: 1 } },
        { id: 5, deleted: true },
      ],
      next,
    },
    [next]: {
      values: [
        { id: 6, parent: { id: 3 } },
        { id: 7, parent: { id: 1 } },
        { id: 8, parent: { id: 3 } },
        { id: 9, parent: { id: 404 } },
        { id: 10, parent: { id: 11 } },
        { id: 11, parent: { id: 10 } },
      ],
    },
    [`${path}/1`]: { id: 1 },
    [`${path}/2`]: {
      id: 2,
      inline: { path: 'src/file.ts', to: 3 },
      deleted: true,
    },
    [`${path}/3`]: { id: 3, parent: { id: 2 } },
  };
  const calls: string[] = [];
  const request = async <T>(url: string, requestSignal: AbortSignal) => {
    calls.push(url);
    expect(requestSignal).toBe(signal);
    if (url === `${path}/404`) throw new CloudRequestError(404);
    if (!(url in responses)) throw new Error(`Unexpected URL ${url}`);
    return { data: responses[url] as T, headers: new Headers() };
  };

  const first = await listGeneralComments(request, ref, undefined, signal);
  expect(first.items.map(({ id }) => id)).toEqual(['1', '4']);
  expect(first.nextCursor).toBe(next);
  expect(calls).toEqual([`${path}?pagelen=30`]);

  const second = await listGeneralComments(
    request,
    ref,
    first.nextCursor,
    signal,
  );
  expect(second.items.map(({ id }) => id)).toEqual(['7']);
  expect(second.nextCursor).toBeUndefined();
  expect(calls.filter((url) => url === `${path}/3`)).toHaveLength(1);
});
