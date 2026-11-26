import { normalizeGitlabBaseUrl, parseWebUrl } from './gitlab-url';

export function parseMergeRequestLocation(input: string) {
  const url = parseWebUrl(input.trim());
  if (!url || url.username || url.password) return;

  const match = url.pathname.match(
    /^\/(.+?)\/(?:-\/)?merge_requests\/(\d+)(?:\/.*)?$/,
  );
  const iid = Number(match?.[2]);
  if (!match || !Number.isSafeInteger(iid) || iid < 1) return;

  return { origin: url.origin, path: `/${match[1]}`, iid };
}

export function matchMergeRequestProject(
  location: NonNullable<ReturnType<typeof parseMergeRequestLocation>>,
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
