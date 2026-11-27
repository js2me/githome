import { skipToken } from '@tanstack/query-core';
import { createQuery, queryClient } from 'mobx-tanstack-query/preset';
import type {
  MergeRequestNavItem,
  Workspace,
} from '@/features/workspace-navigation';
import {
  type GitLabMergeRequestApprovalSummary,
  type GitLabMergeRequestDiscussionSummary,
  gitlabApi,
} from '@/shared/api/gitlab';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';

interface ProjectTabs {
  connection: GitLabConnection;
  project: { id: number; path_with_namespace?: string };
  tabs: { iid: number; id: string }[];
}

export interface WorkspaceReview {
  approval?: GitLabMergeRequestApprovalSummary;
  discussions?: GitLabMergeRequestDiscussionSummary;
}

function groupTabs(
  items: MergeRequestNavItem[],
  connections: GitLabConnection[],
) {
  const byConnection = new Map(
    connections.map((connection) => [connection.id, connection]),
  );
  const projects = new Map<string, ProjectTabs>();
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

async function fetchReviews(groups: ProjectTabs[], signal: AbortSignal) {
  const result: Record<string, WorkspaceReview> = {};
  await Promise.all(
    groups.map(async ({ connection, project, tabs }) => {
      const iids = tabs.map(({ iid }) => iid);
      const [approvals, discussions] = await Promise.allSettled([
        gitlabApi.getMergeRequestApprovalSummaries(
          connection,
          project,
          iids,
          signal,
        ),
        gitlabApi.getMergeRequestDiscussionSummaries(
          connection,
          project,
          iids,
          signal,
        ),
      ]);
      signal.throwIfAborted();
      for (const { id, iid } of tabs) {
        result[id] = {
          approval:
            approvals.status === 'fulfilled' ? approvals.value[iid] : undefined,
          discussions:
            discussions.status === 'fulfilled'
              ? discussions.value[iid]
              : undefined,
        };
      }
    }),
  );
  return result;
}

export function createWorkspaceReviewQuery(
  { stores }: Workspace,
  abortSignal: AbortSignal,
  getItems: () => MergeRequestNavItem[],
) {
  return createQuery(queryClient, () => {
    const groups = groupTabs(getItems(), stores.settings.connections);
    return {
      abortSignal,
      enabled: groups.length > 0,
      queryKey: [
        'workspace-review',
        groups.map(({ connection, project, tabs }) => [
          connection.id,
          connection.gitlabUrl,
          connection.credentialsRevision,
          project,
          tabs,
        ]),
      ],
      queryFn: groups.length
        ? ({ signal }: { signal: AbortSignal }) => fetchReviews(groups, signal)
        : skipToken,
      retry: false,
      refetchInterval: 60_000,
    };
  });
}
