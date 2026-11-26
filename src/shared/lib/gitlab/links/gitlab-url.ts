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
