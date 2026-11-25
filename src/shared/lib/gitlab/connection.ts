import { normalizeGitlabBaseUrl } from "@/shared/api/gitlab";
import type { GitLabConnectionItem } from "@/shared/lib/storage";

export type GitLabConnection = GitLabConnectionItem;

export const getConnectionLabel = (connection: GitLabConnectionItem): string => {
  try {
    return new URL(normalizeGitlabBaseUrl(connection.gitlabUrl)).host;
  } catch {
    return connection.gitlabUrl || "GitLab";
  }
};

export const normalizeJiraBaseUrl = (value?: string): string | undefined => {
  const input = value?.trim();
  if (!input || !/^https?:\/\/[^/\\?#\s]/i.test(input)) return undefined;

  try {
    const url = new URL(input);
    if (url.username || url.password) return undefined;

    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    return undefined;
  }
};

export const parseConnectionDraft = (
  gitlabUrl: string,
  gitToken: string,
  jiraUrl?: string,
): Omit<GitLabConnection, "id"> | null => {
  const url = gitlabUrl.trim();
  const token = gitToken.trim();
  const jiraBaseUrl = normalizeJiraBaseUrl(jiraUrl);
  if (!url || !token || (jiraUrl?.trim() && !jiraBaseUrl)) return null;

  return { gitlabUrl: url, gitToken: token, jiraUrl: jiraBaseUrl };
};
