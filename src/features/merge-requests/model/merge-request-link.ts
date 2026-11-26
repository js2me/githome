import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import {
  matchMergeRequestProject,
  parseMergeRequestLocation,
} from '@/shared/lib/gitlab/links/merge-request';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';

export function resolveMergeRequestLink(
  input: string,
  connections: readonly GitLabConnection[],
  activeId: string | null,
) {
  const location = parseMergeRequestLocation(input);
  if (!location)
    throw new LocalizedError('review.pasteAGitlabMergeRequestLink');

  let selected:
    | { connection: GitLabConnection; projectPath: string; specificity: number }
    | undefined;
  for (const connection of connections) {
    const match = matchMergeRequestProject(location, connection.gitlabUrl);
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

  return {
    connection: selected.connection,
    projectPath: selected.projectPath,
    iid: location.iid,
  };
}
