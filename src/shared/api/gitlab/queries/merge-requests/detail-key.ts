import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { gitlabConnectionKey } from '../core/keys';

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
    ...gitlabConnectionKey(connection),
    projectId,
    iid,
  ] as const;
