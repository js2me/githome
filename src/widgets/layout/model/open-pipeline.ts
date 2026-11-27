import type { Workspace } from '@/features/workspace-navigation';
import { gitlabApi } from '@/shared/api/gitlab';
import { resolveGitlabProjectLink } from '@/shared/lib/gitlab/connection/resolve-project-link';
import type { parsePipelineLocation } from '@/shared/lib/gitlab/links/pipeline';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';

export async function resolvePipelineTarget(
  { stores: { settings } }: Workspace,
  location: NonNullable<ReturnType<typeof parsePipelineLocation>>,
  signal: AbortSignal,
) {
  const { connection, projectPath } = resolveGitlabProjectLink(
    location,
    settings.connections,
    settings.activeId,
  );
  const project = await gitlabApi.getProject(connection, projectPath, signal);
  if (!Number.isSafeInteger(project.id) || project.id < 1) {
    throw new LocalizedError('pipelines.couldNotLoadThePipeline');
  }
  return { connection, project, pipelineId: location.id };
}
