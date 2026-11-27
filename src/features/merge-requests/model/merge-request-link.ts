import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { resolveGitlabProjectLink } from '@/shared/lib/gitlab/connection/resolve-project-link';
import { parseMergeRequestLocation } from '@/shared/lib/gitlab/links/merge-request';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';

export function resolveMergeRequestLink(
  input: string,
  connections: readonly GitLabConnection[],
  activeId: string | null,
) {
  const location = parseMergeRequestLocation(input);
  if (!location)
    throw new LocalizedError('review.pasteAGitlabMergeRequestLink');

  return {
    ...resolveGitlabProjectLink(location, connections, activeId),
    iid: location.iid,
  };
}
