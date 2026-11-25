import type { GitLabConnection } from '@/shared/lib/gitlab/connection';
import type {
  GitLabMergeRequestApprovalSummary,
  GitLabMergeRequestApprovalsDC,
  GitLabProjectDC,
} from '../data-contracts';
import { getMergeRequestApprovals } from './get-merge-request-approvals';

const summarize = (
  data: GitLabMergeRequestApprovalsDC,
): GitLabMergeRequestApprovalSummary | null => {
  if (!Array.isArray(data.approved_by)) return null;
  const count = data.approved_by.length;
  if (!count || (data.approvals_left != null && data.approvals_left > 0)) {
    return { count, approved: false };
  }
  if (typeof data.approved === 'boolean')
    return { count, approved: data.approved };
  if (data.approvals_required === 0) return { count, approved: true };

  // A voter can be ineligible for a required rule, even if the count meets its quota.
  return { count, approved: data.approvals_left === 0 ? true : null };
};

export const getMergeRequestApprovalSummaries = async (
  connection: GitLabConnection,
  project: Pick<GitLabProjectDC, 'id'>,
  mergeRequestIids: readonly number[],
  signal?: AbortSignal,
): Promise<Partial<Record<number, GitLabMergeRequestApprovalSummary>>> => {
  signal?.throwIfAborted();
  const entries = await Promise.all(
    [...new Set(mergeRequestIids)].map(async (iid) => {
      try {
        const approvals = await getMergeRequestApprovals(
          connection,
          project,
          iid,
          signal,
        );
        const summary = summarize(approvals);
        return summary && ([iid, summary] as const);
      } catch {
        signal?.throwIfAborted();
        return null;
      }
    }),
  );

  return Object.fromEntries(entries.filter((entry) => entry !== null));
};
