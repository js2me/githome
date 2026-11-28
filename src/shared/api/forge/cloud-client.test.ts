import { afterEach, expect, it, vi } from 'vitest';
import { bindForgeAccount } from './adapter';

afterEach(() => vi.unstubAllGlobals());

it.each([
  { provider: 'github' as const, id: 'gh', gitToken: 'github-secret' },
  {
    provider: 'bitbucket' as const,
    id: 'bb',
    gitToken: 'bitbucket-secret',
    email: 'work@example.com',
    workspace: 'team',
  },
])(
  'does not send $provider credentials to a foreign pagination URL',
  async (connection) => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const adapter = bindForgeAccount(connection)?.adapter;
    if (!adapter) throw new Error('Missing adapter');
    await expect(
      adapter.listRepositories(
        'https://elsewhere.example/repos',
        new AbortController().signal,
      ),
    ).rejects.toThrow('Invalid provider API URL');
    expect(fetch).not.toHaveBeenCalled();
  },
);
