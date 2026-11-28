export interface GitLabConnectionItem {
  id: string;
  provider?: 'gitlab';
  gitlabUrl: string;
  gitToken: string;
  credentialsRevision?: string;
  jiraUrl?: string;
  email?: never;
  workspace?: never;
}

export type CloudCredentials =
  | { provider: 'github'; gitToken: string; email?: never; workspace?: never }
  | {
      provider: 'bitbucket';
      gitToken: string;
      email: string;
      workspace: string;
    };

export type CloudConnection = CloudCredentials & {
  id: string;
  credentialsRevision?: string;
  gitlabUrl?: never;
  jiraUrl?: never;
};

export type ForgeConnection = GitLabConnectionItem | CloudConnection;

export const parseCloudCredentials = (
  draft: CloudCredentials,
): CloudCredentials | null => {
  const gitToken = draft.gitToken.trim();
  if (!gitToken) return null;
  if (draft.provider === 'github') return { provider: 'github', gitToken };

  const email = draft.email.trim();
  const workspace = draft.workspace.trim();
  if (!/^[^\s:@]+@[^\s:@]+$/.test(email) || !/^[\w-]+$/.test(workspace))
    return null;

  return { provider: 'bitbucket', gitToken, email, workspace };
};
