import { normalizeGitlabBaseUrl, parseWebUrl } from './gitlab-url';
import { parseMergeRequestLocation } from './merge-request';

export function parseProjectLocation(input: string) {
  const url = parseWebUrl(input.trim());
  if (
    !url ||
    url.username ||
    url.password ||
    parseMergeRequestLocation(url.href)
  )
    return;

  const path = url.pathname.replace(/\/$/, '');
  const segments = path.slice(1).split('/');
  if (
    segments.length < 2 ||
    segments.some(
      (part) =>
        !/^[\w.-]+$/.test(part) ||
        part === '-' ||
        part === '.' ||
        part === '..',
    )
  )
    return;

  return { origin: url.origin, path };
}

export function matchGitlabProject(
  location: { origin: string; path: string },
  gitlabUrl: string,
) {
  const base = parseWebUrl(normalizeGitlabBaseUrl(gitlabUrl));
  if (
    !base ||
    base.username ||
    base.password ||
    base.origin !== location.origin
  )
    return;

  const prefix = base.pathname.replace(/\/+$/, '');
  if (!location.path.startsWith(`${prefix}/`)) return;

  try {
    const projectPath = decodeURIComponent(
      location.path.slice(prefix.length + 1),
    );
    const segments = projectPath.split('/');
    if (
      segments.length < 2 ||
      segments.some((part) => !part || part === '.' || part === '..')
    )
      return;
    return { projectPath, specificity: prefix.length };
  } catch {
    return;
  }
}
