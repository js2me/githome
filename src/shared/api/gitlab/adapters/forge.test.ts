import { afterEach, expect, it, vi } from 'vitest';
import { createGitlabAdapter } from './forge';

afterEach(() => vi.unstubAllGlobals());

it('implements the same repository, pull request and comment contract for legacy GitLab connections', async () => {
  const connection = {
    id: 'old-gitlab',
    gitlabUrl: 'https://gitlab.example',
    gitToken: 'test',
  };
  const fetch = vi.fn(async (input: string, init: RequestInit) => {
    const { pathname } = new URL(input, connection.gitlabUrl);
    expect(new Headers(init.headers).get('PRIVATE-TOKEN')).toBe('test');
    if (pathname.endsWith('/api/v4/projects')) {
      return Response.json(
        [
          {
            id: 19,
            name: 'repo',
            path_with_namespace: 'group/repo',
            web_url: 'https://gitlab.example/group/repo',
          },
        ],
        { headers: { 'X-Next-Page': '2' } },
      );
    }
    if (pathname.endsWith('/merge_requests/42')) {
      return Response.json({
        iid: 42,
        title: 'Review',
        state: 'merged',
        source_branch: 'feature',
        target_branch: 'main',
        web_url: 'https://gitlab.example/group/repo/-/merge_requests/42',
      });
    }
    if (
      pathname.endsWith('/merge_requests/42/notes') &&
      init.method === 'POST'
    ) {
      expect(JSON.parse(String(init.body))).toEqual({ body: 'Done' });
      return Response.json({ id: 1, body: 'Done' });
    }
    throw new Error(`Unexpected GitLab endpoint: ${pathname}`);
  });
  vi.stubGlobal('fetch', fetch);

  const adapter = createGitlabAdapter(connection);
  const signal = new AbortController().signal;
  const page = await adapter.listRepositories(undefined, signal);
  expect(page.items[0]).toMatchObject({ id: '19', path: 'group/repo' });
  expect(page.nextCursor).toBe('2');
  const ref = { repositoryId: page.items[0].id, number: 42 };
  await expect(adapter.getPullRequest(ref, signal)).resolves.toMatchObject({
    number: 42,
    state: 'merged',
    sourceBranch: 'feature',
    targetBranch: 'main',
  });
  await adapter.createComment(ref, 'Done', signal);
  expect(fetch).toHaveBeenCalledTimes(3);
});
