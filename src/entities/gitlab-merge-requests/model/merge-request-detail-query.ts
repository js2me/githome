import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';

export const mergeRequestDetailKey = (
  connection: Pick<
    GitLabConnection,
    'id' | 'gitlabUrl' | 'credentialsRevision'
  >,
  projectId: number,
  iid: number,
) =>
  [
    'merge-request-detail',
    connection.id,
    connection.gitlabUrl,
    connection.credentialsRevision ?? null,
    projectId,
    iid,
  ] as const;
