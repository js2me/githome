export const normalizeGitlabBaseUrl = (url: string): string => {
  let normalized = url.trim();
  if (!normalized) return '';

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  return normalized.replace(/\/+$/, '');
};

export function parseWebUrl(input: string): URL | undefined {
  if (!/^https?:\/\//i.test(input) || !URL.canParse(input)) return;
  return new URL(input);
}

export function resolveGitlabQuickLink(input: string, gitlabUrl?: string) {
  const value = input.trim();
  if (/^https?:\/\//i.test(value)) return value;
  const reference = /^([\w.-]+(?:\/[\w.-]+)+)!([1-9]\d*)$/.exec(value);
  const base = gitlabUrl && normalizeGitlabBaseUrl(gitlabUrl);
  return reference && base
    ? `${base}/${reference[1]}/-/merge_requests/${reference[2]}`
    : '';
}
