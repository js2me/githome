import { normalizeGitlabBaseUrl } from "@/shared/api/gitlab";
import type { GitLabConnectionItem } from "@/shared/lib/storage";

export const getConnectionLabel = (connection: GitLabConnectionItem): string => {
  try {
    return new URL(normalizeGitlabBaseUrl(connection.gitlabUrl)).host;
  } catch {
    return connection.gitlabUrl || "GitLab";
  }
};

export const isConnectionDraftValid = (
  gitlabUrl: string,
  gitToken: string,
): boolean => {
  return Boolean(gitlabUrl.trim() && gitToken.trim());
};
