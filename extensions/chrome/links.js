export const redirectRuleId = 1;
const mrPath = '/(?:[^/?#]+/){2,}-/merge_requests/[1-9][0-9]*(?:/[^?#]*)?';
const mrPathPattern = new RegExp(`^${mrPath}$`);

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

export function isMergeRequest(input, origin) {
  try {
    const url = new URL(input);
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.origin === origin && mrPathPattern.test(url.pathname);
  } catch {
    return false;
  }
}

export const mergeRequestFilter = (origin) =>
  `^${escapeRegex(origin)}${mrPath}(?:[?#].*)?$`;

export const appLink = (url) => `githome://open-mr?url=${encodeURIComponent(url)}`;

export function navigationRules(origin, auto, bridge) {
  return {
    removeRuleIds: [redirectRuleId],
    addRules: origin ? [{
      id: redirectRuleId,
      priority: 1,
      action: {
        type: 'redirect',
        // Chrome inserts the original URL verbatim, so the app reads everything after raw=.
        redirect: { regexSubstitution: auto ? 'githome://open-mr?raw=\\0' : `${bridge}?url=\\0` },
      },
      condition: {
        regexFilter: mergeRequestFilter(origin),
        resourceTypes: ['main_frame'],
        isUrlFilterCaseSensitive: true,
      },
    }] : [],
  };
}
