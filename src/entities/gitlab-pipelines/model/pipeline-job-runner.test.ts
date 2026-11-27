import { afterEach, describe, expect, it, vi } from 'vitest';
import { type GitLabJobDC, gitlabApi } from '@/shared/api/gitlab';
import { PipelineJobRunner } from './pipeline-job-runner';

const job = (id: number, status = 'manual'): GitLabJobDC => ({
  id,
  name: `job-${id}`,
  stage: 'deploy',
  status,
});

const context = () => ({
  scope: 'fixture/1/2',
  connection: {
    id: 'fixture',
    gitToken: 'test',
    gitlabUrl: 'https://gitlab.test',
  },
  projectId: 1,
  signal: new AbortController().signal,
  refresh: vi.fn(async () => {}),
});

describe('PipelineJobRunner', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts different jobs in parallel and prevents a duplicate click', async () => {
    const pending = Promise.withResolvers<GitLabJobDC>();
    const play = vi
      .spyOn(gitlabApi, 'playPipelineJob')
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(job(2, 'pending'));
    const runner = new PipelineJobRunner();
    const ctx = context();

    const first = runner.run([job(1)], ctx);
    expect(runner.pendingAction(ctx.scope, 1)).toBe('play');
    expect(runner.pendingAction(ctx.scope, 2)).toBeUndefined();
    await runner.run([job(1), job(2)], ctx);
    expect(play.mock.calls.map(([, , id]) => id)).toEqual([1, 2]);
    expect(runner.pendingAction(ctx.scope, 1)).toBe('play');
    expect(runner.pendingAction(ctx.scope, 2)).toBeUndefined();

    pending.resolve(job(1, 'pending'));
    await first;
    expect(runner.hasPending).toBe(false);
  });

  it('allows the rest of a batch to run after failures and refreshes once', async () => {
    const play = vi
      .spyOn(gitlabApi, 'playPipelineJob')
      .mockRejectedValueOnce(new Error('Denied'))
      .mockResolvedValueOnce(job(2, 'pending'))
      .mockRejectedValueOnce(new Error('Unavailable'));
    const runner = new PipelineJobRunner();
    const ctx = context();

    await runner.run([job(1), job(2), job(3), job(4, 'skipped')], ctx);
    expect(play.mock.calls.map(([, , id]) => id)).toEqual([1, 2, 3]);
    expect(ctx.refresh).toHaveBeenCalledTimes(1);
    expect(runner.errorMessage(ctx.scope)).toContain('job-1 — Denied');
    expect(runner.errorMessage(ctx.scope)).toContain('job-3 — Unavailable');
    expect(runner.errorMessage('another-scope')).toBe('');
    expect(runner.hasPending).toBe(false);
  });
});
