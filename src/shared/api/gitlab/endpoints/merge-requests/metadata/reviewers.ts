import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { gitlabGraphql } from '../../../client';

interface MergeRequestLocation {
  projectPath: string;
  iid: number;
}

const assertUpdated = (result?: { errors: string[] } | null) => {
  if (result?.errors.length) throw new Error(result.errors.join('\n'));
  if (!result) throw new LocalizedError('common.couldNotCompleteTheAction');
};

export const changeMergeRequestReviewer = async (
  connection: GitLabConnection,
  location: MergeRequestLocation,
  username: string,
  selected: boolean,
  signal: AbortSignal,
) => {
  const data = await gitlabGraphql<{
    mergeRequestSetReviewers: { errors: string[] } | null;
  }>(
    connection,
    `mutation ChangeMrReviewer($path: ID!, $iid: String!, $username: String!, $mode: MutationOperationMode!) {
      mergeRequestSetReviewers(input: {
        projectPath: $path, iid: $iid, reviewerUsernames: [$username], operationMode: $mode
      }) { errors }
    }`,
    {
      path: location.projectPath,
      iid: String(location.iid),
      username,
      mode: selected ? 'APPEND' : 'REMOVE',
    },
    signal,
  );
  assertUpdated(data.mergeRequestSetReviewers);
};

export const requestMergeRequestRereview = async (
  connection: GitLabConnection,
  location: MergeRequestLocation,
  userId: number,
  signal: AbortSignal,
) => {
  const data = await gitlabGraphql<{
    mergeRequestReviewerRereview: { errors: string[] } | null;
  }>(
    connection,
    `mutation RequestMrRereview($path: ID!, $iid: String!, $user: UserID!) {
      mergeRequestReviewerRereview(input: {
        projectPath: $path, iid: $iid, userId: $user
      }) { errors }
    }`,
    {
      path: location.projectPath,
      iid: String(location.iid),
      user: `gid://gitlab/User/${userId}`,
    },
    signal,
  );
  assertUpdated(data.mergeRequestReviewerRereview);
};
