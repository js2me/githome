const mrPath = '/(?:[^/?#]+/){2,}-/merge_requests/[1-9][0-9]*(?:/[^?#]*)?';
const pipelinePath = '/(?:[^/?#]+/){2,}-/pipelines/[1-9][0-9]*/?';
const linkKinds = [
  { id: 1, action: 'open-mr', path: mrPath },
  { id: 2, action: 'open-pipeline', path: pipelinePath },
].map((kind) => ({ ...kind, pattern: new RegExp(`^${kind.path}$`) }));

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function gitlabOrigin(input) {
  const text = input.trim();
  if (!text) return null;
  try {
    const url = new URL(text.includes('://') ? text : `https://${text}`);
    if (url.protocol !== 'https:' || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export const permissionPattern = (origin) => `https://${new URL(origin).hostname}/*`;

export function gitlabLinkKind(input, origin) {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.origin !== origin) return null;
    return linkKinds.find(({ pattern }) => pattern.test(url.pathname))?.action ?? null;
  } catch {
    return null;
  }
}

export const appLink = (url, kind) => `githome://${kind}?url=${encodeURIComponent(url)}`;

export function navigationRules(origin, auto, bridge) {
  return {
    removeRuleIds: linkKinds.map(({ id }) => id),
    addRules: origin ? linkKinds.map(({ id, action, path }) => ({
      id,
      priority: 1,
      action: {
        type: 'redirect',
        // Chrome inserts the original URL verbatim, so the app reads everything after raw=.
        redirect: { regexSubstitution: auto ? `githome://${action}?raw=\\0` : `${bridge}?url=\\0` },
      },
      condition: {
        regexFilter: `^${escapeRegex(origin)}${path}(?:[?#].*)?$`,
        resourceTypes: ['main_frame'],
        isUrlFilterCaseSensitive: true,
      },
    })) : [],
  };
}
