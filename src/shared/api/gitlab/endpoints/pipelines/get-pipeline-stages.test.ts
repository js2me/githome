import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPipelineStages } from './get-pipeline-stages';

const connection = {
  id: 'test',
  gitlabUrl: 'https://gitlab.test',
  gitToken: 'fixture',
};
const page = (names: string[], endCursor: string | null) =>
  Response.json({
    data: {
      project: {
        pipeline: {
          stages: {
            nodes: names.map((name) => ({ name })),
            pageInfo: { hasNextPage: Boolean(endCursor), endCursor },
          },
        },
      },
    },
  });

describe('getPipelineStages', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserves GitLab stage order across pages', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    fetch.mockResolvedValueOnce(page(['test', 'build'], 'next'));
    fetch.mockResolvedValueOnce(page(['deploy-dev'], null));
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    await expect(
      getPipelineStages(connection, 'group/project', 4821, signal),
    ).resolves.toEqual(['test', 'build', 'deploy-dev']);
    expect(fetch.mock.calls.map(([, init]) => init?.signal)).toEqual([
      signal,
      signal,
    ]);
    expect(
      fetch.mock.calls.map(
        ([, init]) => JSON.parse(String(init?.body)).variables,
      ),
    ).toEqual([
      {
        path: 'group/project',
        id: 'gid://gitlab/Ci::Pipeline/4821',
        after: null,
      },
      {
        path: 'group/project',
        id: 'gid://gitlab/Ci::Pipeline/4821',
        after: 'next',
      },
    ]);
  });
});
