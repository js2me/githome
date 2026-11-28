import type {
  GitLabApprovalRule,
  GitLabProjectLabelDC,
  GitLabUserDC,
} from '@/shared/api/gitlab/data-contracts';
import { getMergeRequestMetadata } from '@/shared/api/gitlab/endpoints/merge-requests/metadata/get-metadata';
import {
  defineGitlabApiQuery,
  defineGitlabQuery,
  defineInfiniteGitlabQuery,
} from '@/shared/api/gitlab/queries/core/define-query';
import { gitlabConnectionKey } from '../core/keys';

export const createMergeRequestMetadataQuery = defineGitlabApiQuery<
  Awaited<ReturnType<typeof getMergeRequestMetadata>>,
  { projectPath: string; iid: number }
>({
  queryKey: ({ connection, projectPath, iid }) => [
    'merge-request-metadata',
    ...gitlabConnectionKey(connection),
    projectPath,
    iid,
  ],
  queryFn: ({ connection, projectPath, iid, signal }) =>
    getMergeRequestMetadata(connection, projectPath, iid, signal),
  queryOptions: {
    staleTime: 20_000,
    retry: false,
    refetchInterval: 30_000,
  },
});

export const createLabelCandidatesQuery = defineInfiniteGitlabQuery<
  GitLabProjectLabelDC,
  { projectId: number; search?: string }
>(({ projectId, search }) => ({
  path: `/projects/${projectId}/labels`,
  query: {
    search,
    per_page: 30,
    include_ancestor_groups: true,
    archived: false,
  },
}));

export const createReviewerCandidatesQuery = defineInfiniteGitlabQuery<
  GitLabUserDC,
  { projectId: number; search?: string }
>(({ projectId, search }) => ({
  path: `/projects/${projectId}/users`,
  query: { search, per_page: 30 },
}));

export const createMergeRequestApprovalStateQuery = defineGitlabQuery<
  { rules: GitLabApprovalRule[] } | null,
  { projectId: number; iid: number }
>(({ projectId, iid }) => ({
  path: `/projects/${projectId}/merge_requests/${iid}/approval_state`,
  notFoundAsNull: true,
}));
