import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeMergeRequest } from './merge-merge-request';

const connection = {
  id: 'fixture',
  gitlabUrl: 'https://gitlab.example.com',
  gitToken: 'fixture',
};
const options = {
  sha: 'reviewed-sha',
  squash: true,
  shouldRemoveSourceBranch: false,
  squashCommitMessage: 'Short title',
  strategy: 'MERGE_TRAIN' as const,
};

afterEach(() => vi.unstubAllGlobals());

describe('GitLab merge mutation', () => {
  it('sends the reviewed SHA, GitLab strategy and merge settings unchanged', async () => {
    const fetch = vi.fn(async (_url: string, _request: RequestInit) =>
      Response.json({
        data: {
          mergeRequestAccept: {
            errors: [],
            mergeRequest: { state: 'opened', autoMergeEnabled: true },
          },
        },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    await expect(
      mergeMergeRequest(connection, 'team/project', 42, options),
    ).resolves.toEqual({ state: 'opened', merge_when_pipeline_succeeds: true });

    const [url, request] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/graphql$/);
    expect(request.method).toBe('POST');
    expect(JSON.parse(String(request.body)).variables.input).toEqual({
      ...options,
      projectPath: 'team/project',
      iid: '42',
    });
  });

  it('reports a GitLab rejection instead of treating it as a merge', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          data: {
            mergeRequestAccept: {
              mergeRequest: null,
              errors: ['The merge-head is not at the anticipated SHA'],
            },
          },
        }),
      ),
    );
    await expect(
      mergeMergeRequest(connection, 'team/project', 42, options),
    ).rejects.toThrow('The merge-head is not at the anticipated SHA');
  });
});
