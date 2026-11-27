import { describe, expect, it } from 'vitest';
import type { GitLabMergeOptions } from '@/shared/api/gitlab/endpoints/merge-requests/lifecycle/merge-options';
import { mergeMode } from './strategy';

const options = {
  mergeable: true,
  mergeOngoing: false,
  autoMergeEnabled: false,
  availableAutoMergeStrategies: [],
  diffHeadSha: 'reviewed-sha',
  userPermissions: { canMerge: true, removeSourceBranch: true },
} as unknown as GitLabMergeOptions;

describe('GitLab merge strategy', () => {
  it('uses the available strategy rather than skipping GitLab checks or a merge train', () => {
    expect(mergeMode(options)).toBe('immediate');
    expect(
      mergeMode({
        ...options,
        mergeable: false,
        availableAutoMergeStrategies: ['merge_when_checks_pass'],
      }),
    ).toBe('MERGE_WHEN_CHECKS_PASS');
    expect(
      mergeMode({
        ...options,
        availableAutoMergeStrategies: ['merge_when_checks_pass', 'merge_train'],
      }),
    ).toBe('MERGE_TRAIN');
  });
  it('never falls back to immediate merge with unknown checks or permissions', () => {
    expect(mergeMode({ ...options, mergeable: false })).toBeNull();
    expect(
      mergeMode({ ...options, availableAutoMergeStrategies: null }),
    ).toBeNull();
    expect(
      mergeMode({
        ...options,
        availableAutoMergeStrategies: ['future_strategy'],
      }),
    ).toBeNull();
    expect(mergeMode({ ...options, autoMergeEnabled: true })).toBeNull();
    expect(mergeMode({ ...options, mergeOngoing: true })).toBeNull();
    expect(
      mergeMode({
        ...options,
        userPermissions: { ...options.userPermissions, canMerge: false },
      }),
    ).toBeNull();
  });
});
