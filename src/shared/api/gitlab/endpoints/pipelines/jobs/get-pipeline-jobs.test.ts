import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPipelineJobs } from './get-pipeline-jobs';

const connection = {
  id: 'test',
  gitlabUrl: 'https://gitlab.test',
  gitToken: 'fixture',
};
const fetchMock = vi.fn<typeof fetch>();
const makeJobs = (start: number, length: number) =>
  Array.from({ length }, (_, i) => ({
    id: start + i,
    stage: 'verify',
    status: 'success',
    name: `build-${start + i}`,
  }));
const page = (
  jobs: ReturnType<typeof makeJobs>,
  headers?: Record<string, string>,
) => new Response(JSON.stringify(jobs), { headers });
const paths = () =>
  fetchMock.mock.calls.map(
    ([input]) => new URL(String(input), 'https://app.test'),
  );

describe('getPipelineJobs', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads all jobs in API order and excludes retried jobs from every page', async () => {
    fetchMock
      .mockResolvedValueOnce(
        page(makeJobs(1, 100), { 'X-Page': '1', 'X-Next-Page': '2' }),
      )
      .mockResolvedValueOnce(
        page(makeJobs(100, 39), { 'X-Page': '2', 'X-Next-Page': '' }),
      );
    const controller = new AbortController();
    const jobs = await getPipelineJobs(connection, 20, 40, controller.signal);
    expect(jobs.map((job) => job.id)).toEqual(
      makeJobs(1, 138).map((job) => job.id),
    );
    expect(paths().map((url) => url.searchParams.get('page'))).toEqual([
      '1',
      '2',
    ]);
    for (const url of paths()) {
      expect(url.pathname).toMatch(/\/projects\/20\/pipelines\/40\/jobs$/);
      expect(url.searchParams.get('include_retried')).toBe('false');
      expect(url.searchParams.get('per_page')).toBe('100');
    }
    expect(
      fetchMock.mock.calls.every(
        ([, init]) => init?.signal === controller.signal,
      ),
    ).toBe(true);
  });

  it('continues after full pages when pagination headers are hidden', async () => {
    fetchMock
      .mockResolvedValueOnce(page(makeJobs(1, 100)))
      .mockResolvedValueOnce(page(makeJobs(101, 100)))
      .mockResolvedValueOnce(page([]));
    expect(await getPipelineJobs(connection, 1, 2)).toHaveLength(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('follows Link and total-page headers on shorter server pages', async () => {
    fetchMock
      .mockResolvedValueOnce(
        page(makeJobs(1, 2), { Link: '</api/v4/jobs?page=2>; rel="next"' }),
      )
      .mockResolvedValueOnce(page(makeJobs(3, 2), { 'X-Total-Pages': '3' }))
      .mockResolvedValueOnce(page(makeJobs(5, 1), { 'X-Total-Pages': '3' }));
    expect(await getPipelineJobs(connection, 1, 2)).toHaveLength(5);
  });

  it('rejects repeated data, skipped pages and mismatched current page headers', async () => {
    fetchMock
      .mockResolvedValueOnce(page(makeJobs(1, 100)))
      .mockResolvedValueOnce(page(makeJobs(1, 100)));
    await expect(getPipelineJobs(connection, 1, 2)).rejects.toThrow(
      'GitLab returned a duplicate page',
    );
    const invalid: Record<string, string>[] = [
      { 'X-Next-Page': '3' },
      { 'X-Page': '2' },
      { Link: '</jobs?page=1>; rel="next"' },
    ];
    for (const headers of invalid) {
      fetchMock.mockResolvedValueOnce(page(makeJobs(1, 2), headers));
      await expect(getPipelineJobs(connection, 1, 2)).rejects.toThrow();
    }
  });

  it('does not publish a partial list or start further requests after abort', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(async () => {
      controller.abort();
      return page(makeJobs(1, 100), { 'X-Next-Page': '2' });
    });
    await expect(
      getPipelineJobs(connection, 1, 2, controller.signal),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
