import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';

type ConnectionIdentity = Pick<
  GitLabConnection,
  'id' | 'gitlabUrl' | 'credentialsRevision'
>;

export const gitlabConnectionKey = (connection: ConnectionIdentity) =>
  [
    connection.id,
    connection.gitlabUrl,
    connection.credentialsRevision ?? null,
  ] as const;

export const gitlabRestResourceKey = (
  connection: ConnectionIdentity,
  path: string,
) => ['gitlab-rest', ...gitlabConnectionKey(connection), path] as const;
