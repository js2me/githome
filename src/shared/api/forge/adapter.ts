import type { QueryKey } from '@tanstack/query-core';
import {
  getConnectionLabel,
  normalizeJiraBaseUrl,
} from '@/shared/lib/gitlab/connection/connection';
import { createBitbucketAdapter } from '../bitbucket';
import { createGithubAdapter } from '../github';
import { createGitlabAdapter } from '../gitlab/adapters/forge';
import { gitlabProfileKey } from '../gitlab/queries/connection-profile-query';
import type { ForgeConnection, GitLabConnectionItem } from './connection';
import type { ForgeAdapter, ForgeProvider } from './contracts';

export interface ForgeSession {
  id: string;
  provider: ForgeProvider;
  credentialsRevision?: string;
  adapter: ForgeAdapter;
  profileKey: QueryKey;
  gitlabConnection: GitLabConnectionItem | null;
  host: string;
}

export const bindForgeAccount = (
  connection: ForgeConnection,
): ForgeSession | null => {
  const { id, credentialsRevision } = connection;

  const cloudSession = (
    provider: ForgeProvider,
    host: string,
    adapter: ForgeAdapter,
  ): ForgeSession => ({
    id,
    credentialsRevision,
    provider,
    host,
    adapter,
    gitlabConnection: null,
    profileKey: ['forge', provider, id, credentialsRevision ?? null, 'account'],
  });

  switch (connection.provider) {
    case undefined:
    case 'gitlab': {
      const gitlabUrl = connection.gitlabUrl.trim();
      const gitToken = connection.gitToken.trim();
      if (!gitlabUrl || !gitToken) return null;
      const gitlabConnection = {
        ...connection,
        provider: 'gitlab' as const,
        gitlabUrl,
        gitToken,
        jiraUrl: normalizeJiraBaseUrl(connection.jiraUrl),
      };
      return {
        id,
        credentialsRevision,
        provider: 'gitlab',
        host: getConnectionLabel(gitlabUrl),
        gitlabConnection,
        adapter: createGitlabAdapter(gitlabConnection),
        profileKey: gitlabProfileKey(gitlabConnection),
      };
    }
    case 'github':
      return cloudSession('github', 'GitHub', createGithubAdapter(connection));
    case 'bitbucket':
      return cloudSession(
        'bitbucket',
        `Bitbucket · ${connection.workspace}`,
        createBitbucketAdapter(connection),
      );
  }
};
