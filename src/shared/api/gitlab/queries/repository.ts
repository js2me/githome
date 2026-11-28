import type {
  GitLabBranchDC,
  GitLabCommitDC,
  GitLabMergeRequestChangeDC,
  GitLabSearchBlobDC,
} from '@/shared/api/gitlab/data-contracts';
import { gitlabApi } from '@/shared/api/gitlab/index';
import {
  defineGitlabApiQuery,
  defineInfiniteGitlabQuery,
} from '@/shared/api/gitlab/queries/core/define-query';
import { isImagePath } from '@/shared/lib/image-path';
import { gitlabConnectionKey } from './core/keys';

export const createProjectBlobSearchQuery = defineGitlabApiQuery<
  GitLabSearchBlobDC[],
  { projectId: number; ref: string; search: string }
>({
  queryKey: ({ connection, projectId, ref, search }) =>
    [
      'project-blob-search',
      ...gitlabConnectionKey(connection),
      projectId,
      ref,
      search,
    ] as const,
  queryFn: ({ connection, projectId, ref, search, signal }) =>
    gitlabApi.searchProjectBlobs(connection, projectId, search, ref, signal),
});

export const createProjectFileSearchQuery = defineGitlabApiQuery<
  GitLabSearchBlobDC[],
  { projectId: number; ref: string; search: string }
>({
  queryKey: ({ connection, projectId, ref, search }) =>
    [
      'project-file-search',
      ...gitlabConnectionKey(connection),
      projectId,
      ref,
      search,
    ] as const,
  queryFn: ({ connection, projectId, ref, search, signal }) =>
    gitlabApi.searchProjectBlobs(connection, projectId, search, ref, signal),
});

export const createRepositoryFileContentQuery = defineGitlabApiQuery<
  string | Awaited<ReturnType<typeof gitlabApi.getRepositoryFileBlob>>,
  { projectId: number; ref: string; filePath: string }
>({
  queryKey: ({ connection, projectId, ref, filePath }) =>
    [
      'repository-file-content',
      ...gitlabConnectionKey(connection),
      projectId,
      ref,
      filePath,
    ] as const,
  queryFn: ({ connection, projectId, ref, filePath, signal }) =>
    isImagePath(filePath)
      ? gitlabApi.getRepositoryFileBlob(
          connection,
          projectId,
          filePath,
          ref,
          signal,
        )
      : gitlabApi.getRepositoryFileContent(
          connection,
          projectId,
          filePath,
          ref,
          signal,
        ),
});

export const createProjectBranchesQuery = defineGitlabApiQuery<
  GitLabBranchDC[],
  { projectId: number }
>({
  queryKey: ({ connection, projectId }) =>
    [
      'project-branches',
      ...gitlabConnectionKey(connection),
      projectId,
    ] as const,
  queryFn: ({ connection, projectId, signal }) =>
    gitlabApi.getProjectBranches(connection, projectId, signal),
});

export const createRepositoryCommitsQuery = defineInfiniteGitlabQuery<
  GitLabCommitDC,
  { projectId: number; refName: string }
>(({ projectId, refName }) => ({
  path: `/projects/${projectId}/repository/commits`,
  query: { ref_name: refName, per_page: 30 },
}));

export const createCommitDiffQuery = defineInfiniteGitlabQuery<
  GitLabMergeRequestChangeDC,
  { projectId: number; commitId: string }
>(({ projectId, commitId }) => ({
  path: `/projects/${projectId}/repository/commits/${commitId}/diff`,
  query: { per_page: 100 },
}));
