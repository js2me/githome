import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { fetchGitlabJson } from '../../client';
import type { GitLabGroupDC, GitLabProjectDC } from '../../data-contracts';
import { fetchPaginatedItems } from '../../fetch-paginated-items';

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
  const path = `/groups/${group.id}`;
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
  return { group, subgroups, projects };
};
