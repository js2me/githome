import type {
  MergeRequestNavItem,
  Workspace,
} from '@/features/workspace-navigation';
import {
  createGitlabWorkspaceReviewQuery,
  type WorkspaceReviewGroup,
} from '@/shared/api/gitlab/queries/merge-requests/review/workspace';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';

export type { WorkspaceReview } from '@/shared/api/gitlab/queries/merge-requests/review/workspace';

function groupTabs(
  items: MergeRequestNavItem[],
  connections: GitLabConnection[],
) {
  const byConnection = new Map(
    connections.map((connection) => [connection.id, connection]),
  );
  const projects = new Map<string, WorkspaceReviewGroup>();
  for (const item of items) {
    const { connectionId, projectId, projectPath, mergeRequestIid } =
      item.payload;
    const connection = byConnection.get(connectionId);
    if (!connection?.gitlabUrl || !connection.gitToken) continue;
    let group = projects.get(item.groupId);
    if (!group) {
      group = { connection, project: { id: projectId }, tabs: [] };
      projects.set(item.groupId, group);
    }
    if (projectPath && !projectPath.startsWith('#'))
      group.project.path_with_namespace = projectPath;
    group.tabs.push({ iid: mergeRequestIid, id: item.id });
  }
  return [...projects.values()];
}

export const createWorkspaceReviewQuery = (
  { stores }: Workspace,
  abortSignal: AbortSignal,
  getItems: () => MergeRequestNavItem[],
) =>
  createGitlabWorkspaceReviewQuery(abortSignal, () =>
    groupTabs(getItems(), stores.settings.connections),
  );
