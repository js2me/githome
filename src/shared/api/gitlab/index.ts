import type { GitLabConnection } from '@/shared/lib/gitlab/connection';
import { fetchGitlabJson } from './client';
import type { GitLabProjectDC } from './data-contracts';
import { approveMergeRequest } from './endpoints/approve-merge-request';
import { cancelMergeRequestRequestedChanges } from './endpoints/cancel-merge-request-requested-changes';
import { cancelPipeline } from './endpoints/cancel-pipeline';
import { cancelPipelineJob } from './endpoints/cancel-pipeline-job';
import { createMergeRequestDiffDiscussion } from './endpoints/create-merge-request-diff-discussion';
import { createMergeRequestDiscussion } from './endpoints/create-merge-request-discussion';
import { createMergeRequestDiscussionNote } from './endpoints/create-merge-request-discussion-note';
import { createPipeline } from './endpoints/create-pipeline';
import { deleteMergeRequestDiscussionNote } from './endpoints/delete-merge-request-discussion-note';
import { getFrequentProjects } from './endpoints/get-frequent-projects';
import { getMergeRequestApprovalSummaries } from './endpoints/get-merge-request-approval-summaries';
import { getMergeRequestChanges } from './endpoints/get-merge-request-changes';
import { getMergeRequestDetail } from './endpoints/get-merge-request-detail';
import { getMergeRequestDiscussionSummaries } from './endpoints/get-merge-request-discussion-summaries';
import { getMergeRequestDiscussions } from './endpoints/get-merge-request-discussions';
import { getMergeRequestVersions } from './endpoints/get-merge-request-versions';
import { getMergeRequestView } from './endpoints/get-merge-request-view';
import { getPipelineJobTrace } from './endpoints/get-pipeline-job-trace';
import { getPipelineJobs } from './endpoints/get-pipeline-jobs';
import { getProject } from './endpoints/get-project';
import { getProjectAnalytics } from './endpoints/get-project-analytics';
import { getProjectBranches } from './endpoints/get-project-branches';
import { getProjectMergeRequests } from './endpoints/get-project-merge-requests';
import { getProjectReadme } from './endpoints/get-project-readme';
import {
  getRepositoryFileBlob,
  getRepositoryFileImage,
} from './endpoints/get-repository-file-blob';
import { getRepositoryFileContent } from './endpoints/get-repository-file-content';
import { getRepositoryTree } from './endpoints/get-repository-tree';
import { playPipelineJob } from './endpoints/play-pipeline-job';
import { renderMarkdown } from './endpoints/render-markdown';
import { requestMergeRequestChanges } from './endpoints/request-merge-request-changes';
import { resolveMergeRequestDiscussion } from './endpoints/resolve-merge-request-discussion';
import { retryPipeline } from './endpoints/retry-pipeline';
import { retryPipelineJob } from './endpoints/retry-pipeline-job';
import { searchProjectBlobs } from './endpoints/search-project-blobs';
import { unapproveMergeRequest } from './endpoints/unapprove-merge-request';
import { updateMergeRequestDiscussionNote } from './endpoints/update-merge-request-discussion-note';
import { uploadProjectMarkdown } from './endpoints/upload-project-markdown';

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

  getProjectReadme,

  getRepositoryFileContent,

  getRepositoryFileBlob,

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

  deleteMergeRequestDiscussionNote,

  resolveMergeRequestDiscussion,

  updateMergeRequestDiscussionNote,

  uploadProjectMarkdown,

  getMergeRequestView,

  approveMergeRequest,

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
