import { action, computed, makeObservable, observable, runInAction } from "mobx";
import { createQuery } from "mobx-tanstack-query/preset";
import { gitlabApi } from "@/shared/api/gitlab";
import type {
  CreateDiffCommentInput,
  GitLabMergeRequestApprovalView,
  GitLabMergeRequestChanges,
  GitLabMergeRequestDetail,
  GitLabMergeRequestDiscussions,
} from "@/shared/api/gitlab";
import type { RepositoryModelContext } from "@/pages/repository/model/repository-model-context";

type MergeRequestViewQuery = {
  data?: {
    detail: GitLabMergeRequestDetail;
    changes: GitLabMergeRequestChanges;
    discussions: GitLabMergeRequestDiscussions;
    approvals: GitLabMergeRequestApprovalView;
  };
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
};

export type MrReviewAction = "approve" | "unapprove" | "requestChanges" | "cancelRequestChanges";

export class MrInfoModel {
  mergeRequestViewQuery!: MergeRequestViewQuery;
  isSubmittingDiffComment = false;
  submitDiffCommentError: string | null = null;
  resolvingDiscussionId: string | null = null;
  resolveDiscussionError: string | null = null;
  reviewActionInProgress: MrReviewAction | null = null;
  reviewActionError: string | null = null;

  constructor(private ctx: RepositoryModelContext) {
    this.mergeRequestViewQuery = createQuery({
      abortSignal: ctx.unmountSignal,
      queryKey: () =>
        [
          "gitlab",
          "merge-request-view",
          ctx.globals.stores.settings.activeConnection?.id ?? null,
          ctx.projectId,
          ctx.mergeRequestIid,
        ] as const,
      queryFn: ({ signal }) => {
        const connection = ctx.globals.stores.settings.activeConnection;
        const project = ctx.selectedProject;
        const mergeRequestIid = ctx.mergeRequestIid;

        if (!connection || !project || mergeRequestIid === null) {
          throw new Error("Merge request is not selected");
        }

        return gitlabApi.getMergeRequestView(
          connection,
          project,
          mergeRequestIid,
          signal,
        );
      },
      options: () => ({
        enabled:
          !!ctx.globals.stores.settings.activeConnection &&
          !!ctx.selectedProject &&
          ctx.mergeRequestIid !== null,
      }),
    });

    makeObservable(this, {
      mergeRequestViewQuery: observable,
      isSubmittingDiffComment: observable,
      submitDiffCommentError: observable,
      resolvingDiscussionId: observable,
      resolveDiscussionError: observable,
      reviewActionInProgress: observable,
      reviewActionError: observable,
      mergeRequestDetail: computed,
      mergeRequestChanges: computed,
      mergeRequestDiscussions: computed,
      mergeRequestApprovals: computed,
      isLoading: computed,
      errorMessage: computed,
      submitDiffComment: action,
      clearSubmitDiffCommentError: action,
      resolveDiscussion: action,
      clearResolveDiscussionError: action,
      approve: action,
      unapprove: action,
      requestChanges: action,
      cancelRequestChanges: action,
      clearReviewActionError: action,
      loadDiffFileContent: action,
    });
  }

  get mergeRequestDetail(): GitLabMergeRequestDetail | null {
    return this.mergeRequestViewQuery.data?.detail ?? null;
  }

  get mergeRequestChanges(): GitLabMergeRequestChanges | null {
    return this.mergeRequestViewQuery.data?.changes ?? null;
  }

  get mergeRequestDiscussions(): GitLabMergeRequestDiscussions | null {
    return this.mergeRequestViewQuery.data?.discussions ?? null;
  }

  get mergeRequestApprovals(): GitLabMergeRequestApprovalView | null {
    return this.mergeRequestViewQuery.data?.approvals ?? null;
  }

  get isLoading() {
    return (
      this.mergeRequestViewQuery.isLoading ||
      this.mergeRequestViewQuery.isFetching
    );
  }

  get errorMessage() {
    const error = this.mergeRequestViewQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error
      ? error.message
      : "Не удалось загрузить merge request";
  }

  async submitDiffComment(input: CreateDiffCommentInput) {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;
    const diffRefs = this.mergeRequestDetail?.diffRefs;

    if (!connection || !project || mergeRequestIid === null) {
      this.submitDiffCommentError = "Merge request не выбран";
      return false;
    }

    if (!diffRefs) {
      this.submitDiffCommentError = "Нельзя оставить комментарий: нет diff refs";
      return false;
    }

    if (!input.body.trim()) {
      this.submitDiffCommentError = "Введите текст комментария";
      return false;
    }

    this.isSubmittingDiffComment = true;
    this.submitDiffCommentError = null;

    try {
      await gitlabApi.createMergeRequestDiffDiscussion(
        connection,
        project,
        mergeRequestIid,
        diffRefs,
        {
          ...input,
          body: input.body.trim(),
        },
      );

      await this.invalidateMergeRequestView();

      return true;
    } catch (error) {
      runInAction(() => {
        this.submitDiffCommentError =
          error instanceof Error
            ? error.message
            : "Не удалось отправить комментарий";
      });
      return false;
    } finally {
      runInAction(() => {
        this.isSubmittingDiffComment = false;
      });
    }
  }

  clearSubmitDiffCommentError() {
    this.submitDiffCommentError = null;
  }

  clearResolveDiscussionError() {
    this.resolveDiscussionError = null;
  }

  clearReviewActionError() {
    this.reviewActionError = null;
  }

  private async invalidateMergeRequestView() {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;

    if (!connection || !project || mergeRequestIid === null) {
      return;
    }

    await this.ctx.globals.stores.queryClient.invalidateQueries({
      queryKey: [
        "gitlab",
        "merge-request-view",
        connection.id,
        project.id,
        mergeRequestIid,
      ],
    });
  }

  private async runReviewAction(
    action: MrReviewAction,
    runner: () => Promise<void>,
  ) {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;

    if (!connection || !project || mergeRequestIid === null) {
      this.reviewActionError = "Merge request не выбран";
      return false;
    }

    this.reviewActionInProgress = action;
    this.reviewActionError = null;

    try {
      await runner();
      await this.invalidateMergeRequestView();
      return true;
    } catch (error) {
      runInAction(() => {
        this.reviewActionError =
          error instanceof Error
            ? error.message
            : "Не удалось выполнить действие";
      });
      return false;
    } finally {
      runInAction(() => {
        this.reviewActionInProgress = null;
      });
    }
  }

  async approve() {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;
    const headSha = this.mergeRequestDetail?.diffRefs?.headSha ?? null;

    if (!connection || !project || mergeRequestIid === null) {
      this.reviewActionError = "Merge request не выбран";
      return false;
    }

    return this.runReviewAction("approve", () =>
      gitlabApi.approveMergeRequest(connection, project, mergeRequestIid, {
        sha: headSha,
      }),
    );
  }

  async unapprove() {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;

    if (!connection || !project || mergeRequestIid === null) {
      this.reviewActionError = "Merge request не выбран";
      return false;
    }

    return this.runReviewAction("unapprove", () =>
      gitlabApi.unapproveMergeRequest(connection, project, mergeRequestIid),
    );
  }

  async requestChanges() {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;

    if (!connection || !project || mergeRequestIid === null) {
      this.reviewActionError = "Merge request не выбран";
      return false;
    }

    return this.runReviewAction("requestChanges", () =>
      gitlabApi.requestMergeRequestChanges(
        connection,
        project,
        mergeRequestIid,
      ),
    );
  }

  async cancelRequestChanges() {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;

    if (!connection || !project || mergeRequestIid === null) {
      this.reviewActionError = "Merge request не выбран";
      return false;
    }

    return this.runReviewAction("cancelRequestChanges", () =>
      gitlabApi.cancelMergeRequestRequestedChanges(
        connection,
        project,
        mergeRequestIid,
      ),
    );
  }

  async resolveDiscussion(discussionId: string, resolved: boolean) {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;

    if (!connection || !project || mergeRequestIid === null) {
      this.resolveDiscussionError = "Merge request не выбран";
      return false;
    }

    this.resolvingDiscussionId = discussionId;
    this.resolveDiscussionError = null;

    try {
      await gitlabApi.resolveMergeRequestDiscussion(
        connection,
        project,
        mergeRequestIid,
        discussionId,
        resolved,
      );

      await this.invalidateMergeRequestView();

      return true;
    } catch (error) {
      runInAction(() => {
        this.resolveDiscussionError =
          error instanceof Error
            ? error.message
            : "Не удалось обновить статус треда";
      });
      return false;
    } finally {
      runInAction(() => {
        this.resolvingDiscussionId = null;
      });
    }
  }

  async loadDiffFileContent(filePath: string, ref: string) {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;

    if (!connection || !project) {
      throw new Error("Repository is not selected");
    }

    return gitlabApi.getRepositoryFileContent(
      connection,
      project.id,
      filePath,
      ref,
      this.ctx.unmountSignal,
    );
  }
}
