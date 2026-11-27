import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabGraphql } from '../../../client';

export interface MergeRequestLabelDetails {
  id: string;
  title: string;
  color: string;
  description?: string | null;
}

export const getMergeRequestMetadata = async (
  connection: GitLabConnection,
  projectPath: string,
  iid: number,
  signal: AbortSignal,
) => {
  const data = await gitlabGraphql<{
    project: {
      userPermissions: { createLabel: boolean };
      mergeRequest: {
        userPermissions: {
          updateMergeRequest: boolean;
        };
        labels?: { nodes: MergeRequestLabelDetails[] } | null;
      } | null;
    } | null;
  }>(
    connection,
    `query MrMetadata($path: ID!, $iid: String!) {
      project(fullPath: $path) {
        userPermissions { createLabel }
        mergeRequest(iid: $iid) {
          userPermissions { updateMergeRequest }
          labels(first: 100) { nodes { id title color description } }
        }
      }
    }`,
    { path: projectPath, iid: String(iid) },
    signal,
  );
  const mr = data.project?.mergeRequest;
  return {
    canUpdate: mr?.userPermissions?.updateMergeRequest,
    canCreateLabel: data.project?.userPermissions?.createLabel,
    labels: mr?.labels?.nodes ?? [],
  };
};
