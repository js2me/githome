import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { fetchGitlabJson } from './client';
import type { GitLabProjectDC } from './data-contracts';
import { renderMarkdown } from './endpoints/markdown/render-markdown';
import { uploadProjectMarkdown } from './endpoints/markdown/upload-project-markdown';
import { approveMergeRequest } from './endpoints/merge-requests/approvals/approve-merge-request';
import { cancelMergeRequestRequestedChanges } from './endpoints/merge-requests/approvals/cancel-merge-request-requested-changes';
import { getMergeRequestApprovalSummaries } from './endpoints/merge-requests/approvals/get-merge-request-approval-summaries';
import { requestMergeRequestChanges } from './endpoints/merge-requests/approvals/request-merge-request-changes';
import { unapproveMergeRequest } from './endpoints/merge-requests/approvals/unapprove-merge-request';
import { createMergeRequestDiffDiscussion } from './endpoints/merge-requests/discussions/mutations/create-merge-request-diff-discussion';
import { createMergeRequestDiscussion } from './endpoints/merge-requests/discussions/mutations/create-merge-request-discussion';
import { createMergeRequestDiscussionNote } from './endpoints/merge-requests/discussions/mutations/create-merge-request-discussion-note';
import { deleteMergeRequestDiscussionNote } from './endpoints/merge-requests/discussions/mutations/delete-merge-request-discussion-note';
import { resolveMergeRequestDiscussion } from './endpoints/merge-requests/discussions/mutations/resolve-merge-request-discussion';
import { updateMergeRequestDiscussionNote } from './endpoints/merge-requests/discussions/mutations/update-merge-request-discussion-note';
import { getMergeRequestDiscussionSummaries } from './endpoints/merge-requests/discussions/queries/get-merge-request-discussion-summaries';
import { getMergeRequestDiscussions } from './endpoints/merge-requests/discussions/queries/get-merge-request-discussions';
import { getMergeRequestChanges } from './endpoints/merge-requests/get-merge-request-changes';
import { getMergeRequestDetail } from './endpoints/merge-requests/get-merge-request-detail';
import { getMergeRequestVersions } from './endpoints/merge-requests/get-merge-request-versions';
import { getMergeRequestView } from './endpoints/merge-requests/get-merge-request-view';
import { getProjectMergeRequests } from './endpoints/merge-requests/get-project-merge-requests';
import { closeMergeRequest } from './endpoints/merge-requests/lifecycle/close-merge-request';
import { saveMergeRequestNote } from './endpoints/merge-requests/notes/save-merge-request-note';
import { cancelPipeline } from './endpoints/pipelines/cancel-pipeline';
import { createPipeline } from './endpoints/pipelines/create-pipeline';
import { getPipelineStages } from './endpoints/pipelines/get-pipeline-stages';
import { cancelPipelineJob } from './endpoints/pipelines/jobs/cancel-pipeline-job';
import { getPipelineJobTrace } from './endpoints/pipelines/jobs/get-pipeline-job-trace';
import { getPipelineJobs } from './endpoints/pipelines/jobs/get-pipeline-jobs';
import { playPipelineJob } from './endpoints/pipelines/jobs/play-pipeline-job';
import { retryPipelineJob } from './endpoints/pipelines/jobs/retry-pipeline-job';
import { retryPipeline } from './endpoints/pipelines/retry-pipeline';
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

export const gitlabApi = {
  async fetch<T = unknown>(
    connection: GitLabConnection,
    path: string,
    options?: {
      query?: Record<string, string | number | boolean | null | undefined>;
      signal?: AbortSignal;
    },
  ): Promise<T> {
    return fetchGitlabJson<T>(connection, path, options);
  },

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

  createPipeline,

  cancelPipeline,

  retryPipeline,

  cancelPipelineJob,

  playPipelineJob,

  retryPipelineJob,

  getMergeRequestApprovalSummaries,

  getMergeRequestDetail,

  getMergeRequestChanges,

  getMergeRequestVersions,

  getMergeRequestDiscussions,

  getMergeRequestDiscussionSummaries,

  createMergeRequestDiffDiscussion,

  createMergeRequestDiscussionNote,

  createMergeRequestDiscussion,

  saveMergeRequestNote,

  deleteMergeRequestDiscussionNote,

  resolveMergeRequestDiscussion,

  updateMergeRequestDiscussionNote,

  uploadProjectMarkdown,

  getMergeRequestView,

  approveMergeRequest,

  closeMergeRequest,

  unapproveMergeRequest,

  requestMergeRequestChanges,

  cancelMergeRequestRequestedChanges,

  renderMarkdown,
};

export {
  buildGitlabRequestHeaders,
  fetchGitlabAssetBlob,
  isGitlabProxiedAssetUrl,
  normalizeGitlabBaseUrl,
  resolveGitlabAssetUrl,
  resolveGitlabRequestUrl,
} from './client';
export type * from './data-contracts';
