import { normalizeGitlabBaseUrl } from '@/shared/api/gitlab/client';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';

export function resolveMergeRequestLink(
  input: string,
  connections: readonly GitLabConnection[],
  activeId: string | null,
) {
  const invalidLink = 'Вставьте ссылку на мерж-реквест GitLab.';
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error(invalidLink);
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
    throw new Error(invalidLink);
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
    throw new Error(`Добавьте подключение к ${url.host} в шапке GitHome.`);

  let projectPath: string;
  try {
    projectPath = decodeURIComponent(
      projectLocation.slice(basePath.length + 1),
    );
  } catch {
    throw new Error(invalidLink);
  }
  const segments = projectPath.split('/');
  if (
    segments.length < 2 ||
    segments.some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error(invalidLink);
  }
  return { connection: selected, projectPath, iid };
}
