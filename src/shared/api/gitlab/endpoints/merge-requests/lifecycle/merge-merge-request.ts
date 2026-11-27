import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { gitlabGraphql, gitlabPost } from '../../../client';

export type GitLabMergeStrategy =
  | 'MERGE_TRAIN'
  | 'MERGE_WHEN_CHECKS_PASS'
  | 'ADD_TO_MERGE_TRAIN_WHEN_CHECKS_PASS';

export interface GitLabMergeInput {
  sha: string;
  strategy?: GitLabMergeStrategy;
  squash: boolean;
  shouldRemoveSourceBranch?: boolean;
  commitMessage?: string;
  squashCommitMessage?: string;
}

export async function mergeMergeRequest(
  connection: GitLabConnection,
  projectPath: string,
  iid: number,
  options: GitLabMergeInput,
) {
  const { mergeRequestAccept: payload } = await gitlabGraphql<{
    mergeRequestAccept: {
      errors: string[];
      mergeRequest: { state: string; autoMergeEnabled: boolean } | null;
    } | null;
  }>(
    connection,
    `
      mutation GitHomeMergeRequest($input: MergeRequestAcceptInput!) {
        mergeRequestAccept(input: $input) {
          errors
          mergeRequest { state autoMergeEnabled }
        }
      }
    `,
    { input: { ...options, projectPath, iid: String(iid) } },
  );
  if (!payload?.mergeRequest || payload.errors.length) {
    throw new LocalizedError(
      'review.couldNotMerge',
      undefined,
      payload?.errors.join('\n'),
    );
  }
  return {
    state: payload.mergeRequest.state.toLowerCase(),
    merge_when_pipeline_succeeds: payload.mergeRequest.autoMergeEnabled,
  };
}

export async function cancelAutoMerge(
  connection: GitLabConnection,
  projectId: number,
  iid: number,
) {
  const result = await gitlabPost<{ status?: string; message?: string }>(
    connection,
    `/projects/${projectId}/merge_requests/${iid}/cancel_merge_when_pipeline_succeeds`,
    {},
  );
  if (result.status === 'error') {
    throw new LocalizedError(
      'review.couldNotCancelAutoMerge',
      undefined,
      result.message,
    );
  }
  return { merge_when_pipeline_succeeds: false };
}
