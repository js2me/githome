import { normalizeGitlabBaseUrl } from '@/shared/api/gitlab/client';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';

export function resolveMergeRequestLink(
  input: string,
  connections: readonly GitLabConnection[],
  activeId: string | null,
) {
  const invalidLink = () =>
    new LocalizedError('review.pasteAGitlabMergeRequestLink');
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw invalidLink();
  }

  const match = url.pathname.match(
    /^\/(.+?)\/(?:-\/)?merge_requests\/(\d+)(?:\/.*)?$/,
  );
  const iid = Number(match?.[2]);
  if (
    !match ||
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    !Number.isSafeInteger(iid) ||
    iid < 1
  ) {
    throw invalidLink();
  }

  const projectLocation = `/${match[1]}`;
  let selected: GitLabConnection | undefined;
  let basePath = '';
  for (const connection of connections) {
    let base: URL;
    try {
      base = new URL(normalizeGitlabBaseUrl(connection.gitlabUrl));
    } catch {
      continue;
    }
    const prefix = base.pathname.replace(/\/+$/, '');
    if (base.origin !== url.origin || !projectLocation.startsWith(`${prefix}/`))
      continue;
    if (
      !selected ||
      prefix.length > basePath.length ||
      (prefix === basePath && connection.id === activeId)
    ) {
      selected = connection;
      basePath = prefix;
    }
  }

  if (!selected)
    throw new LocalizedError('review.addAConnectionToAtTheTop', {
      v1: url.host,
    });

  let projectPath: string;
  try {
    projectPath = decodeURIComponent(
      projectLocation.slice(basePath.length + 1),
    );
  } catch {
    throw invalidLink();
  }
  const segments = projectPath.split('/');
  if (
    segments.length < 2 ||
    segments.some((part) => !part || part === '.' || part === '..')
  ) {
    throw invalidLink();
  }
  return { connection: selected, projectPath, iid };
}
