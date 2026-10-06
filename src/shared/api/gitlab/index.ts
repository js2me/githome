import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { fetchGitlabJson } from "./client";
import type { GitLabProjectDC } from "./data-contracts";
import { approveMergeRequest } from "./endpoints/approve-merge-request";
import { cancelPipeline } from "./endpoints/cancel-pipeline";
import { cancelPipelineJob } from "./endpoints/cancel-pipeline-job";
import { cancelMergeRequestRequestedChanges } from "./endpoints/cancel-merge-request-requested-changes";
import { createMergeRequestDiffDiscussion } from "./endpoints/create-merge-request-diff-discussion";
import { createMergeRequestDiscussionNote } from "./endpoints/create-merge-request-discussion-note";
import { createMergeRequestDiscussion } from "./endpoints/create-merge-request-discussion";
import { createPipeline } from "./endpoints/create-pipeline";
import { deleteMergeRequestDiscussionNote } from "./endpoints/delete-merge-request-discussion-note";
import { getFrequentProjects } from "./endpoints/get-frequent-projects";
import { getMergeRequestApprovalCounts } from "./endpoints/get-merge-request-approval-counts";
import { getMergeRequestChanges } from "./endpoints/get-merge-request-changes";
import { getMergeRequestVersions } from "./endpoints/get-merge-request-versions";
import { getMergeRequestDetail } from "./endpoints/get-merge-request-detail";
import { getMergeRequestDiscussions } from "./endpoints/get-merge-request-discussions";
import { getMergeRequestView } from "./endpoints/get-merge-request-view";
import { getProject } from "./endpoints/get-project";
import { getProjectAnalytics } from "./endpoints/get-project-analytics";
import { getProjectBranches } from "./endpoints/get-project-branches";
import { getPipelineJobTrace } from "./endpoints/get-pipeline-job-trace";
import { getProjectMergeRequests } from "./endpoints/get-project-merge-requests";
import { getProjectReadme } from "./endpoints/get-project-readme";
import { getRepositoryFileContent } from "./endpoints/get-repository-file-content";
import { getRepositoryFileBlob } from "./endpoints/get-repository-file-blob";
import { getRepositoryTree } from "./endpoints/get-repository-tree";
import { searchProjectBlobs } from "./endpoints/search-project-blobs";
import { renderMarkdown } from "./endpoints/render-markdown";
import { requestMergeRequestChanges } from "./endpoints/request-merge-request-changes";
import { playPipelineJob } from "./endpoints/play-pipeline-job";
import { retryPipeline } from "./endpoints/retry-pipeline";
import { retryPipelineJob } from "./endpoints/retry-pipeline-job";
import { resolveMergeRequestDiscussion } from "./endpoints/resolve-merge-request-discussion";
import { unapproveMergeRequest } from "./endpoints/unapprove-merge-request";
import { updateMergeRequestDiscussionNote } from "./endpoints/update-merge-request-discussion-note";
import { uploadProjectMarkdown } from "./endpoints/upload-project-markdown";

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

  getProjectReadme,

  getRepositoryFileContent,

  getRepositoryFileBlob,

  getRepositoryTree,

  searchProjectBlobs,

  getProjectMergeRequests,

  createPipeline,

  cancelPipeline,

  retryPipeline,

  cancelPipelineJob,

  playPipelineJob,

  retryPipelineJob,

  getMergeRequestApprovalCounts,

  getMergeRequestDetail,

  getMergeRequestChanges,

  getMergeRequestVersions,

  getMergeRequestDiscussions,

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
} from "./client";
export type * from "./data-contracts";
