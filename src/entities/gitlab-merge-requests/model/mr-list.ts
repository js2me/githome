import { action, computed } from "mobx";
import { gitlabApi } from "@/shared/api/gitlab";
import type { GitLabMergeRequestDC, GitLabProjectDC } from "@/shared/api/gitlab";
import { createGitlabApiQuery, createGitlabQuery } from "@/shared/lib/gitlab/create-query";
import { Globals } from "@/globals";

export interface MrListParams {
  globals: Globals;
  readonly abortSignal: AbortSignal;
  readonly projectId: number;
  readonly selectedProject: GitLabProjectDC | null;
  readonly mergeRequestIid: number | null;
}


export class MrList {
  mergeRequestsQuery;
  mergeRequestApprovalCountsQuery;

  constructor(private params: MrListParams) {
    this.mergeRequestsQuery = createGitlabQuery<GitLabMergeRequestDC[]>({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => ({
        path: `/projects/${params.projectId}/merge_requests`,
        query: {
          state: "opened",
          order_by: "updated_at",
          sort: "desc",
          per_page: 20,
        },
      }),
    });

    this.mergeRequestApprovalCountsQuery = createGitlabApiQuery<
      Record<number, number>,
      { project: GitLabProjectDC; mergeRequestIids: number[] }
    >({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => {
        const project = params.selectedProject;
        const mergeRequestIids = this.mergeRequests.map(
          (mergeRequest) => mergeRequest.iid,
        );

        if (!project || mergeRequestIids.length === 0) {
          return false;
        }

        return { project, mergeRequestIids };
      },
      queryKey: ({ connection, project, mergeRequestIids }) =>
        [
          "merge-request-list-approval-counts",
          connection.gitlabUrl,
          project.id,
          mergeRequestIids,
        ] as const,
      queryFn: ({ connection, project, mergeRequestIids, signal }) =>
        gitlabApi.getMergeRequestApprovalCounts(
          connection,
          project,
          mergeRequestIids,
          signal,
        ),
    });
  }

  @computed
  get mergeRequests(): GitLabMergeRequestDC[] {
    return this.mergeRequestsQuery.data ?? [];
  }

  @computed
  get isLoading() {
    return (
      this.mergeRequestsQuery.isLoading || this.mergeRequestsQuery.isFetching
    );
  }

  @computed
  get errorMessage() {
    const error = this.mergeRequestsQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error
      ? error.message
      : "Не удалось загрузить merge requests";
  }

  @computed
  get selectedMergeRequestIid() {
    return this.params.mergeRequestIid;
  }

  @computed
  get showLoadError() {
    return Boolean(this.errorMessage) && !this.isLoading;
  }

  @computed
  get showEmptyListMessage() {
    return (
      !this.isLoading &&
      !this.errorMessage &&
      this.mergeRequests.length === 0
    );
  }

  @computed
  get showList() {
    return this.mergeRequests.length > 0;
  }

  @computed
  get approvalCounts(): Record<number, number> {
    return this.mergeRequestApprovalCountsQuery.data ?? {};
  }

  @action.bound
  openMergeRequest(mergeRequest: GitLabMergeRequestDC) {
    void this.params.globals.router.routes.mergeRequest.open({
      projectId: String(this.params.projectId),
      mergeRequestIid: String(mergeRequest.iid),
    });
  }
}
