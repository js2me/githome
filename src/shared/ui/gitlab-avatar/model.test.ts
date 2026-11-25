import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection';
import type { Globals } from '@/shared/model/globals';
import { type GitlabAvatarPayload, GitlabAvatarVM } from './model';

const first: GitLabConnection = {
  id: 'a',
  gitlabUrl: 'https://git.test',
  gitToken: 'token-a',
};
const second: GitLabConnection = {
  id: 'b',
  gitlabUrl: 'https://other.test/gitlab',
  gitToken: 'token-b',
};
const globals = {
  stores: { settings: { activeConnection: first } },
} as Globals;
const fetchMock = vi.fn<typeof fetch>();
let model: GitlabAvatarVM;

const mount = (payload: Partial<GitlabAvatarPayload>) => {
  model = new GitlabAvatarVM(globals, {
    id: 'avatar',
    payload: { avatarUrl: '/uploads/avatar.png', name: 'Account', ...payload },
  });
  model.mount();
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  model?.unmount();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('GitLab account avatars', () => {
  it('resolves a relative public avatar against its GitLab instance in web builds', () => {
    vi.stubEnv('DEV', false);
    mount({ avatarUrl: 'uploads/avatar.png', connection: second });
    expect(model.displaySrc).toBe(
      'https://other.test/gitlab/uploads/avatar.png',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tries a private web avatar only on the same origin using the chosen account', async () => {
    vi.stubEnv('DEV', false);
    fetchMock.mockResolvedValueOnce(new Response(new Blob(['avatar'])));
    mount({ connection: second });
    expect(model.displaySrc).toBe('https://other.test/uploads/avatar.png');
    model.handleImageError();
    await vi.waitFor(() => expect(model.displaySrc).toMatch(/^blob:/));
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { 'PRIVATE-TOKEN': 'token-b' },
      redirect: 'error',
    });
  });

  it('loads a CDN image directly and never passes GitLab credentials to it', () => {
    mount({
      avatarUrl: '//cdn.test/photo.png?private_token=secret&size=40',
      connection: second,
    });
    expect(model.displaySrc).toBe('https://cdn.test/photo.png?size=40');
    model.handleImageError();
    expect(model.displaySrc).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aborts the previous account's request even if both accounts use the same image path", async () => {
    vi.stubEnv('DEV', true);
    let finishFirst!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = resolve;
        }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response('unavailable', { status: 403 }),
    );
    mount({});
    const firstRequest = fetchMock.mock.calls[0];
    expect(firstRequest[1]?.headers).toMatchObject({
      'PRIVATE-TOKEN': 'token-a',
    });
    model.setPayload({ ...model.payload, connection: second });
    expect(firstRequest[1]?.signal?.aborted).toBe(true);
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
      'PRIVATE-TOKEN': 'token-b',
    });
    finishFirst(new Response('stale avatar'));
    await vi.waitFor(() =>
      expect(model.displaySrc).toBe('https://other.test/uploads/avatar.png'),
    );
    model.handleImageError();
    expect(model.displaySrc).toBeNull();
  });

  it('strips a token embedded in the URL before an anonymous image retry', async () => {
    vi.stubEnv('DEV', false);
    fetchMock.mockRejectedValueOnce(new TypeError('CORS'));
    mount({ avatarUrl: '/uploads/avatar.png?private_token=secret&size=20' });
    await vi.waitFor(() =>
      expect(model.displaySrc).toBe(
        'https://git.test/uploads/avatar.png?size=20',
      ),
    );
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('secret');
    model.handleImageError();
    expect(model.displaySrc).toBeNull();
  });
});
