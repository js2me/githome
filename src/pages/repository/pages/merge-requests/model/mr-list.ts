import { action, computed, makeObservable, observable } from "mobx";
import { createQuery } from "mobx-tanstack-query/preset";
import { gitlabApi } from "@/shared/api/gitlab";
import type { GitLabMergeRequest } from "@/shared/api/gitlab";
import type { RepositoryModelContext } from "@/pages/repository/model/repository-model-context";

type MergeRequestsQuery = {
  data?: GitLabMergeRequest[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
};

export class MrListModel {
  mergeRequestsQuery!: MergeRequestsQuery;

  constructor(private ctx: RepositoryModelContext) {
    this.mergeRequestsQuery = createQuery({
      abortSignal: ctx.unmountSignal,
      queryKey: () =>
        [
          "gitlab",
          "merge-requests",
          ctx.globals.stores.settings.activeConnection?.id ?? null,
          ctx.projectId,
        ] as const,
      queryFn: ({ signal }) => {
        const connection = ctx.globals.stores.settings.activeConnection;
        const project = ctx.selectedProject;

        if (!connection || !project) {
          throw new Error("Repository is not selected");
        }

        return gitlabApi.getProjectMergeRequests(connection, project, {
          limit: 20,
          signal,
        });
      },
      options: () => ({
        enabled:
          !!ctx.globals.stores.settings.activeConnection && !!ctx.selectedProject,
      }),
    });

    makeObservable(this, {
      mergeRequestsQuery: observable,
      mergeRequests: computed,
      isLoading: computed,
      errorMessage: computed,
      selectedMergeRequestIid: computed,
      openMergeRequest: action,
    });
  }

  get mergeRequests(): GitLabMergeRequest[] {
    return this.mergeRequestsQuery.data ?? [];
  }

  get isLoading() {
    return (
      this.mergeRequestsQuery.isLoading || this.mergeRequestsQuery.isFetching
    );
  }

  get errorMessage() {
    const error = this.mergeRequestsQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error
      ? error.message
      : "Не удалось загрузить merge requests";
  }

  get selectedMergeRequestIid() {
    return this.ctx.mergeRequestIid;
  }

  openMergeRequest(mergeRequest: GitLabMergeRequest) {
    void this.ctx.globals.router.routes.mergeRequest.open({
      projectId: String(this.ctx.projectId),
      mergeRequestIid: String(mergeRequest.iid),
    });
  }
}
