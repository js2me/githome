import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { matchGitlabProject } from '../links/project';

export function resolveGitlabProjectLink(
  location: { origin: string; path: string },
  connections: readonly GitLabConnection[],
  activeId: string | null,
) {
  let selected:
    | { connection: GitLabConnection; projectPath: string; specificity: number }
    | undefined;
  for (const connection of connections) {
    const match = matchGitlabProject(location, connection.gitlabUrl);
    if (
      match &&
      (!selected ||
        match.specificity > selected.specificity ||
        (match.specificity === selected.specificity &&
          connection.id === activeId))
    ) {
      selected = { connection, ...match };
    }
  }

  if (!selected)
    throw new LocalizedError('review.addAConnectionToAtTheTop', {
      v1: new URL(location.origin).host,
    });

  const { connection, projectPath } = selected;
  return { connection, projectPath };
}
