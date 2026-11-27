import { queryClient } from 'mobx-tanstack-query/preset';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Globals } from '@/shared/model/globals';
import { MergeRequestReactions } from './merge-request-reactions';

const connection = {
  id: 'work',
  gitlabUrl: 'https://gitlab.example',
  gitToken: 'test',
};
const target = { projectId: 42, mergeRequestIid: 13 };
const path = '/api/v4/projects/42/merge_requests/13/award_emoji';
const award = (id: number, name: string, userId: number) => ({
  id,
  name,
  user: { id: userId },
});
const ownLike = award(2, 'thumbsup', 1);
const otherLike = award(1, 'thumbsup', 99);
const ownDislike = award(3, 'thumbsdown', 1);

describe('merge request reactions', () => {
  let controller: AbortController;
  let model: MergeRequestReactions;

  beforeEach(() => {
    controller = new AbortController();
    model = new MergeRequestReactions({
      globals: {
        stores: { settings: { activeConnection: connection } },
      } as Globals,
      abortSignal: controller.signal,
      target: () => target,
      currentUserId: () => 1,
    });
  });

  afterEach(() => {
    controller.abort();
    queryClient.clear();
    vi.unstubAllGlobals();
  });

  it('counts paginated GitLab reactions and marks only the current user’s', async () => {
    const request = vi.fn(async (input: string, init: RequestInit) => {
      const url = new URL(input, connection.gitlabUrl);
      expect(url.pathname).toContain(path);
      expect(new Headers(init.headers).get('PRIVATE-TOKEN')).toBe('test');
      return url.searchParams.get('page') === '1'
        ? Response.json([otherLike], { headers: { 'X-Next-Page': '2' } })
        : Response.json([
            ownLike,
            award(4, 'thumbsdown', 99),
            award(5, 'fire', 1),
          ]);
    });
    vi.stubGlobal('fetch', request);

    await model.query.refetch();

    expect(request).toHaveBeenCalledTimes(2);
    expect(model.getReaction('thumbsup')).toEqual({ count: 2, selected: true });
    expect(model.getReaction('thumbsdown')).toEqual({
      count: 1,
      selected: false,
    });
  });

  it('adds a dislike without clearing the like, then removes only the user’s like', async () => {
    const save = Promise.withResolvers<Response>();
    const request = vi.fn(async (input: string, init: RequestInit) => {
      const url = new URL(input, connection.gitlabUrl);
      if (init.method === 'POST') {
        expect(url.pathname).toContain(path);
        expect(JSON.parse(String(init.body))).toEqual({ name: 'thumbsdown' });
        return save.promise;
      }
      if (init.method === 'DELETE') {
        expect(url.pathname.endsWith(`${path}/${ownLike.id}`)).toBe(true);
        return new Response(null, { status: 204 });
      }
      return Response.json([otherLike, ownLike]);
    });
    vi.stubGlobal('fetch', request);
    await model.query.refetch();

    const saving = model.toggle('thumbsdown');
    expect(model.canReact).toBe(false);
    await model.toggle('thumbsdown');
    save.resolve(Response.json(ownDislike, { status: 201 }));
    await saving;

    expect(model.getReaction('thumbsup')).toEqual({ count: 2, selected: true });
    expect(model.getReaction('thumbsdown')).toEqual({
      count: 1,
      selected: true,
    });

    await model.toggle('thumbsup');

    expect(model.getReaction('thumbsup')).toEqual({
      count: 1,
      selected: false,
    });
    expect(model.getReaction('thumbsdown')).toEqual({
      count: 1,
      selected: true,
    });
    expect(request.mock.calls.map(([, init]) => init.method ?? 'GET')).toEqual([
      'GET',
      'POST',
      'DELETE',
    ]);
  });

  it('keeps the current reaction after a rejected write and allows retry', async () => {
    let fail = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string, init: RequestInit) => {
        if (init.method === 'DELETE') {
          return new Response(null, { status: fail ? 403 : 204 });
        }
        return Response.json([ownLike]);
      }),
    );
    await model.query.refetch();

    await model.toggle('thumbsup');

    expect(model.saveFailed).toBe(true);
    expect(model.canReact).toBe(true);
    expect(model.getReaction('thumbsup')).toEqual({ count: 1, selected: true });

    fail = false;
    await model.toggle('thumbsup');

    expect(model.saveFailed).toBe(false);
    expect(model.getReaction('thumbsup')).toEqual({
      count: 0,
      selected: false,
    });
  });
});
