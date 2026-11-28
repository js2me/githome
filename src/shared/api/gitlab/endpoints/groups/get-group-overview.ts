import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { fetchGitlabJson } from '../../client';
import type { GitLabGroupDC, GitLabProjectDC } from '../../data-contracts';
import { fetchPaginatedItems } from '../../fetch-paginated-items';

export interface GroupContents {
  subgroups: GitLabGroupDC[];
  projects: GitLabProjectDC[];
}

export const getGroupContents = async (
  connection: GitLabConnection,
  groupId: number,
  signal: AbortSignal,
): Promise<GroupContents> => {
  const path = `/groups/${groupId}`;
  const [subgroups, projects] = await Promise.all([
    fetchPaginatedItems<GitLabGroupDC>(
      connection,
      `${path}/subgroups`,
      {},
      signal,
    ),
    fetchPaginatedItems<GitLabProjectDC>(
      connection,
      `${path}/projects`,
      { include_subgroups: false, with_shared: false },
      signal,
    ),
  ]);
  return { subgroups, projects };
};

export const getGroupOverview = async (
  connection: GitLabConnection,
  groupPath: string,
  signal: AbortSignal,
) => {
  const group = await fetchGitlabJson<GitLabGroupDC>(
    connection,
    `/groups/${encodeURIComponent(groupPath)}`,
    { query: { with_projects: false }, signal },
  );
  if (!Number.isSafeInteger(group?.id) || group.id <= 0) {
    throw new LocalizedError('gitlab.missingIdInTheGitlabResponse');
  }
  const contents = await getGroupContents(connection, group.id, signal);
  return { group, ...contents };
};
