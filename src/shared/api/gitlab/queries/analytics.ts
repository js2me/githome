import type { GitLabProjectAnalyticsDC } from '../data-contracts';
import { getProjectAnalytics } from '../endpoints/projects/get-project-analytics';
import {
  type CreateGitlabApiQueryOptions,
  createGitlabApiQuery,
} from './core/create-query';
import { gitlabConnectionKey } from './core/keys';

type AnalyticsScope = {
  projectId: number;
  defaultBranch: string | null;
  since: string;
  until: string;
};
type Options = Omit<
  CreateGitlabApiQueryOptions<GitLabProjectAnalyticsDC, AnalyticsScope>,
  'queryKey' | 'queryFn'
> & {
  onProgress: (key: string) => (analytics: GitLabProjectAnalyticsDC) => void;
};

export const createProjectAnalyticsQuery = ({
  onProgress,
  ...options
}: Options) =>
  createGitlabApiQuery({
    ...options,
    queryKey: ({ connection, projectId, defaultBranch, since, until }) =>
      [
        'repository-analytics',
        ...gitlabConnectionKey(connection),
        projectId,
        defaultBranch,
        since,
        until,
      ] as const,
    queryFn: ({ connection, projectId, defaultBranch, since, until, signal }) =>
      getProjectAnalytics(
        connection,
        projectId,
        defaultBranch,
        since,
        until,
        signal,
        onProgress(
          JSON.stringify([
            connection.gitlabUrl,
            projectId,
            defaultBranch,
            since,
            until,
          ]),
        ),
      ),
  });
