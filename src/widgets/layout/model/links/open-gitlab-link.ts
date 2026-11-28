import { queryClient } from 'mobx-tanstack-query/preset';
import { mergeRequestDetailKey } from '@/entities/gitlab-merge-requests';
import { resolveMergeRequestLink } from '@/features/merge-requests';
import type { Workspace } from '@/features/workspace-navigation';
import { gitlabApi } from '@/shared/api/gitlab';
import { GitLabApiError } from '@/shared/api/gitlab/client';
import { parsePipelineLocation } from '@/shared/lib/gitlab/links/pipeline';
import { parseProjectLocation } from '@/shared/lib/gitlab/links/project';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { resolveProjectTarget } from './open-project';

export async function openGitLabLink(
  workspace: Workspace,
  link: string,
  signal: AbortSignal,
  beforeNavigate?: () => void,
) {
  const pipeline = parsePipelineLocation(link);
  const project = pipeline ?? parseProjectLocation(link);
  const { settings, repository } = workspace.stores;
  try {
    if (project) {
      const target = await resolveProjectTarget(workspace, project, signal);
      if (signal.aborted) return;
      beforeNavigate?.();
      if (settings.activeId !== target.connection.id) {
        settings.setActiveConnection(target.connection.id);
      }
      repository.setProject(target.project);
      const params = { projectId: String(target.project.id) };
      if (pipeline) {
        await workspace.routes.pipelines.open(params, {
          query: { pipeline: String(pipeline.id) },
        });
      } else {
        await workspace.routes.repository.open(params);
      }
      return;
    }

    const { connection, projectPath, iid } = resolveMergeRequestLink(
      link,
      settings.connections,
      settings.activeId,
    );
    const mr = await gitlabApi.getMergeRequestDetail(
      connection,
      projectPath,
      iid,
      signal,
    );
    if (signal.aborted) return;
    if (!mr.project_id || mr.iid !== iid) {
      throw new LocalizedError(
        'navigation.gitlabReturnedIncompleteMergeRequestData',
      );
    }
    queryClient.setQueryData(
      mergeRequestDetailKey(connection, mr.project_id, iid),
      mr,
    );
    beforeNavigate?.();
    workspace.navigation.mergeRequests.open(
      connection.id,
      { id: mr.project_id, path_with_namespace: projectPath },
      iid,
      mr.title,
    );
  } catch (error) {
    if (signal.aborted) return;
    if (
      project &&
      (error instanceof GitLabApiError || error instanceof TypeError)
    ) {
      throw new LocalizedError(
        pipeline
          ? 'pipelines.couldNotLoadThePipeline'
          : 'repository.couldNotLoadTheRepository',
      );
    }
    if (error instanceof GitLabApiError) {
      throw new LocalizedError('navigation.couldNotOpenTheMergeRequestHttp', {
        v1: error.status,
      });
    }
    if (error instanceof TypeError) {
      throw new LocalizedError(
        'navigation.couldNotReachGitlabCheckYourConnection',
      );
    }
    throw error;
  }
}
