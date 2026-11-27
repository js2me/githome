import type { GitLabMergeStrategy } from '@/shared/api/gitlab/endpoints/merge-requests/lifecycle/merge-merge-request';
import type { GitLabMergeOptions } from '@/shared/api/gitlab/endpoints/merge-requests/lifecycle/merge-options';

export type MergeMode = 'immediate' | GitLabMergeStrategy;

const strategies: GitLabMergeStrategy[] = [
  'MERGE_TRAIN',
  'MERGE_WHEN_CHECKS_PASS',
  'ADD_TO_MERGE_TRAIN_WHEN_CHECKS_PASS',
];

export function mergeMode(
  options: GitLabMergeOptions | null,
): MergeMode | null {
  if (
    !options?.userPermissions.canMerge ||
    !options.diffHeadSha ||
    options.mergeOngoing ||
    options.autoMergeEnabled ||
    !Array.isArray(options.availableAutoMergeStrategies)
  )
    return null;

  const available = options.availableAutoMergeStrategies.map((value) =>
    value.toUpperCase(),
  );
  // Do not bypass checks or a merge train if the server offered an unfamiliar strategy.
  if (available.length)
    return strategies.find((strategy) => available.includes(strategy)) ?? null;
  return options.mergeable ? 'immediate' : null;
}
