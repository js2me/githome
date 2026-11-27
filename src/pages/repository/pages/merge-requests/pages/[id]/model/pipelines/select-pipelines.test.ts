import { describe, expect, it } from 'vitest';
import type {
  GitLabMergeRequestDC,
  GitLabPipelineSummaryDC,
} from '@/shared/api/gitlab';
import { selectPipelines } from './select-pipelines';

const mr: GitLabMergeRequestDC = {
  id: 9,
  iid: 2,
  source_branch: 'feature/test',
  target_branch: 'main',
  title: 'Test',
  web_url: '',
  state: 'opened',
  updated_at: '',
  sha: 'head',
};

const run = (id: number, options: Partial<GitLabPipelineSummaryDC> = {}) => ({
  id,
  project_id: 1,
  sha: 'head',
  ref: mr.source_branch,
  source: 'push',
  status: 'success',
  web_url: '',
  ...options,
});

const mrRun = run(10, {
  ref: 'refs/merge-requests/2/head',
  source: 'merge_request_event',
});
const branchRun = run(11, { status: 'failed' });

describe('selectPipelines', () => {
  it('shows both kinds with independent statuses and no duplicate head entry', () => {
    expect(
      selectPipelines(
        { ...mr, head_pipeline: mrRun },
        1,
        [branchRun, mrRun],
        [branchRun],
      ),
    ).toEqual([
      { kind: 'mr', pipeline: mrRun, projectId: 1 },
      { kind: 'branch', pipeline: branchRun, projectId: 1 },
    ]);
  });

  it('shows the newest branch run without head_pipeline even if the MR list is empty', () => {
    expect(selectPipelines(mr, 1, [], [run(6), branchRun])).toEqual([
      { kind: 'branch', pipeline: branchRun, projectId: 1 },
    ]);
  });

  it('does not show a failed branch pipeline from a different commit or another ref', () => {
    expect(
      selectPipelines(
        { ...mr, diff_refs: { head_sha: 'head' }, sha: 'outdated' },
        1,
        [mrRun, run(12, { sha: 'outdated' })],
        [run(13, { ref: 'main' })],
      ),
    ).toEqual([{ kind: 'mr', pipeline: mrRun, projectId: 1 }]);
  });

  it('retains the merged-results head with a synthetic SHA', () => {
    const merged = run(12, {
      ...mrRun,
      id: 12,
      ref: 'refs/merge-requests/2/merge',
      sha: 'merge',
    });
    expect(
      selectPipelines({ ...mr, head_pipeline: merged }, 1, [merged], [])[0]
        ?.pipeline.id,
    ).toBe(12);
    expect(selectPipelines(mr, 1, [merged], [])).toEqual([]);
  });

  it('keeps the owning project for fork pipelines and excludes unrelated branch results', () => {
    const forkBranch = run(8, { project_id: 2 });
    const forkMr = { ...mrRun, project_id: 2 };
    expect(
      selectPipelines(
        { ...mr, source_project_id: 2 },
        1,
        [forkMr, branchRun],
        [forkBranch],
      ),
    ).toEqual([
      { kind: 'mr', pipeline: forkMr, projectId: 2 },
      { kind: 'branch', pipeline: forkBranch, projectId: 2 },
    ]);
  });

  it('recognizes a legacy MR ref when source is absent', () => {
    const legacy = { ...mrRun, source: undefined };
    expect(
      selectPipelines(mr, 1, [legacy], []).map(({ kind }) => kind),
    ).toEqual(['mr']);
  });
});
