import { action, computed, makeObservable, observable, runInAction } from "mobx";
import { createQuery } from "mobx-tanstack-query/preset";
import { gitlabApi } from "@/shared/api/gitlab";
import type {
  CreateDiffCommentInput,
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
  };
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
};

export class MrInfoModel {
  mergeRequestViewQuery!: MergeRequestViewQuery;
  isSubmittingDiffComment = false;
  submitDiffCommentError: string | null = null;

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
      mergeRequestDetail: computed,
      mergeRequestChanges: computed,
      mergeRequestDiscussions: computed,
      isLoading: computed,
      errorMessage: computed,
      submitDiffComment: action,
      clearSubmitDiffCommentError: action,
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

      await this.ctx.globals.stores.queryClient.invalidateQueries({
        queryKey: [
          "gitlab",
          "merge-request-view",
          connection.id,
          project.id,
          mergeRequestIid,
        ],
      });

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
