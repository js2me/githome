import type { Workspace } from '@/features/workspace-navigation';
import { gitlabApi } from '@/shared/api/gitlab';
import { resolveGitlabProjectLink } from '@/shared/lib/gitlab/connection/resolve-project-link';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';

export async function resolveProjectTarget(
  { stores: { settings } }: Workspace,
  location: { origin: string; path: string },
  signal: AbortSignal,
) {
  const { connection, projectPath } = resolveGitlabProjectLink(
    location,
    settings.connections,
    settings.activeId,
  );
  const project = await gitlabApi.getProject(connection, projectPath, signal);
  if (!Number.isSafeInteger(project.id) || project.id < 1) {
    throw new LocalizedError('repository.couldNotLoadTheRepository');
  }
  return { connection, project };
}
