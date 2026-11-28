import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import type { GitLabProjectDC } from './data-contracts';
import { renderMarkdown } from './endpoints/markdown/render-markdown';
import { getMergeRequestApprovalSummaries } from './endpoints/merge-requests/approvals/get-merge-request-approval-summaries';
import { getMergeRequestDiscussionSummaries } from './endpoints/merge-requests/discussions/queries/get-merge-request-discussion-summaries';
import { getMergeRequestDiscussions } from './endpoints/merge-requests/discussions/queries/get-merge-request-discussions';
import { getMergeRequestChanges } from './endpoints/merge-requests/get-merge-request-changes';
import { getMergeRequestDetail } from './endpoints/merge-requests/get-merge-request-detail';
import { getMergeRequestVersions } from './endpoints/merge-requests/get-merge-request-versions';
import { getMergeRequestView } from './endpoints/merge-requests/get-merge-request-view';
import { getProjectMergeRequests } from './endpoints/merge-requests/get-project-merge-requests';
import { getMergeOptions } from './endpoints/merge-requests/lifecycle/merge-options';
import { getPipelineStages } from './endpoints/pipelines/get-pipeline-stages';
import { getPipelineJobTrace } from './endpoints/pipelines/jobs/get-pipeline-job-trace';
import { getPipelineJobs } from './endpoints/pipelines/jobs/get-pipeline-jobs';
import { getFrequentProjects } from './endpoints/projects/get-frequent-projects';
import { getProject } from './endpoints/projects/get-project';
import { getProjectAnalytics } from './endpoints/projects/get-project-analytics';
import { getProjectBranches } from './endpoints/repository/get-project-branches';
import { getProjectReadme } from './endpoints/repository/get-project-readme';
import {
  getRepositoryFileBlob,
  getRepositoryFileImage,
} from './endpoints/repository/get-repository-file-blob';
import { getRepositoryFileBlobId } from './endpoints/repository/get-repository-file-blob-id';
import { getRepositoryFileContent } from './endpoints/repository/get-repository-file-content';
import { getRepositoryTree } from './endpoints/repository/get-repository-tree';
import { searchProjectBlobs } from './endpoints/repository/search-project-blobs';
import { markdownMutations } from './mutations/markdown';
import { mergeRequestMutations } from './mutations/merge-requests';
import { pipelineMutations } from './mutations/pipelines';

export const gitlabApi = {
  ...pipelineMutations,
  ...mergeRequestMutations,
  ...markdownMutations,

  async getFrequentProjects(
    connection: GitLabConnection,
    options?: { limit?: number; signal?: AbortSignal },
  ): Promise<GitLabProjectDC[]> {
    const limit = options?.limit ?? 10;
    return getFrequentProjects(connection, limit, options?.signal);
  },

  getProject,

  getProjectAnalytics,

  getProjectBranches,

  getPipelineJobTrace,
  getPipelineJobs,

  getPipelineStages,

  getProjectReadme,

  getRepositoryFileContent,

  getRepositoryFileBlob,

  getRepositoryFileBlobId,

  getRepositoryFileImage,

  getRepositoryTree,

  searchProjectBlobs,

  getProjectMergeRequests,

  getMergeRequestApprovalSummaries,

  getMergeRequestDetail,

  getMergeRequestChanges,

  getMergeRequestVersions,

  getMergeRequestDiscussions,

  getMergeRequestDiscussionSummaries,

  getMergeRequestView,
  getMergeOptions,
  renderMarkdown,
};

export {
  buildGitlabRequestHeaders,
  fetchGitlabAssetBlob,
  fetchProxiedGitlabAssetBlob,
  isGitlabProxiedAssetUrl,
  normalizeGitlabBaseUrl,
  resolveGitlabAssetUrl,
  resolveGitlabRequestUrl,
} from './client';
export type * from './data-contracts';
