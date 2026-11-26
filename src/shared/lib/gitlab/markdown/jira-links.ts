/** GitLab's Jira project keys start with a letter and have at least two characters. */
export const JIRA_KEY_PATTERN = /\b[A-Z][A-Z0-9_]+-\d+(?![A-Z0-9])/i;
const allJiraKeys = new RegExp(JIRA_KEY_PATTERN, 'gi');

export const findJiraKeys = (text: string): string[] => [
  ...new Set(
    Array.from(text.matchAll(allJiraKeys), ([key]) => key.toUpperCase()),
  ),
];

export const splitJiraText = (
  text: string,
): Array<{ text: string; key?: string }> => {
  const parts: Array<{ text: string; key?: string }> = [];
  let start = 0;
  for (const match of text.matchAll(allJiraKeys)) {
    if (start < match.index)
      parts.push({ text: text.slice(start, match.index) });
    parts.push({ text: match[0], key: match[0].toUpperCase() });
    start = match.index + match[0].length;
  }
  if (start < text.length) parts.push({ text: text.slice(start) });
  return parts;
};

const parseIssueUrl = (href: string) => {
  if (!/^https?:\/\/[^/\\?#\s]/i.test(href)) return;
  try {
    const url = new URL(href);
    if (url.username || url.password) return;
    const browse = /\/browse\/([^/]+)\/?$/.exec(url.pathname);
    if (!browse) return;
    const issueKey = decodeURIComponent(browse[1]);
    if (JIRA_KEY_PATTERN.exec(issueKey)?.[0] !== issueKey) return;
    return {
      key: issueKey.toUpperCase(),
      url,
      basePath: url.pathname.slice(0, browse.index),
    };
  } catch {
    return;
  }
};

export const extractJiraLinks = (
  html: string,
  keys: readonly string[],
): Record<string, string> => {
  const links: Record<string, string> = {};
  if (!html || !keys.length) return links;
  const wanted = new Set(keys.map((key) => key.toUpperCase()));
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const anchor of doc.querySelectorAll('a[href]')) {
    const issue = parseIssueUrl(anchor.getAttribute('href') ?? '');
    if (!issue || !wanted.has(issue.key)) continue;
    const referenceType = anchor.getAttribute('data-reference-type');
    if (referenceType && referenceType !== 'external_issue') continue;
    const markedKey = anchor.getAttribute('data-external-issue')?.toUpperCase();
    if (markedKey && markedKey !== issue.key) continue;
    const label = anchor.textContent?.trim() ?? '';
    if (
      JIRA_KEY_PATTERN.exec(label)?.[0] === label &&
      label.toUpperCase() !== issue.key
    )
      continue;
    if (!links[issue.key] || markedKey) links[issue.key] = issue.url.href;
  }
  return links;
};

export const getJiraProjectUrl = (
  issueUrl: string,
  issueKey: string,
): string | undefined => {
  const issue = parseIssueUrl(issueUrl);
  if (!issue || issue.key !== issueKey.toUpperCase()) return;
  const projectKey = issue.key.slice(0, issue.key.lastIndexOf('-'));
  return `${issue.url.origin}${issue.basePath}/browse/${projectKey}`;
};
