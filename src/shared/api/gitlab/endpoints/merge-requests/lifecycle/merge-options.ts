import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { gitlabGraphql } from '../../../client';

const query = `
  query GitHomeMergeOptions($projectPath: ID!, $iid: String!) {
    project(fullPath: $projectPath) {
      mergeRequestsFfOnlyEnabled
      mergeRequest(iid: $iid) {
        mergeable
        mergeOngoing
        autoMergeEnabled
        availableAutoMergeStrategies
        diffHeadSha
        shouldRemoveSourceBranch
        forceRemoveSourceBranch
        commitCount
        squashReadOnly
        squashOnMerge
        defaultMergeCommitMessage
        defaultSquashCommitMessage
        mergeError
        headPipeline { status }
        userPermissions { canMerge removeSourceBranch }
      }
    }
  }
`;

interface MergeOptions {
  mergeable: boolean;
  mergeOngoing: boolean;
  autoMergeEnabled: boolean;
  availableAutoMergeStrategies: string[] | null;
  diffHeadSha: string | null;
  shouldRemoveSourceBranch: boolean | null;
  forceRemoveSourceBranch: boolean | null;
  commitCount: number | null;
  squashReadOnly: boolean;
  squashOnMerge: boolean;
  defaultMergeCommitMessage: string | null;
  defaultSquashCommitMessage: string | null;
  mergeError: string | null;
  headPipeline: { status: string } | null;
  userPermissions: { canMerge: boolean; removeSourceBranch: boolean };
}

export type GitLabMergeOptions = MergeOptions & {
  mergeRequestsFfOnlyEnabled: boolean;
};

export async function getMergeOptions(
  connection: GitLabConnection,
  projectPath: string,
  iid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeOptions> {
  const { project } = await gitlabGraphql<{
    project: {
      mergeRequestsFfOnlyEnabled: boolean;
      mergeRequest: MergeOptions | null;
    } | null;
  }>(connection, query, { projectPath, iid: String(iid) }, signal);

  if (!project?.mergeRequest) {
    throw new LocalizedError('review.couldNotLoadMergeOptions');
  }
  return {
    ...project.mergeRequest,
    mergeRequestsFfOnlyEnabled: project.mergeRequestsFfOnlyEnabled,
  };
}
