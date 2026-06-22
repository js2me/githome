import { action, computed, observable, runInAction } from "mobx";
import { gitlabApi } from "@/shared/api/gitlab";
import type {
  GitLabDiscussionDC,
  GitLabMergeRequestDC,
  GitLabProjectDC,
} from "@/shared/api/gitlab";
import type { CreateDiffCommentInput } from "@/shared/lib/gitlab/diff-comment";
import type { Globals } from "@/globals";

export type CreateMrCommentContext = {
  project: GitLabProjectDC;
  mergeRequestIid: number;
};

export interface CreateMrCommentParams {
  globals: Globals;
  readonly params: () => CreateMrCommentContext | false;
  readonly getMergeRequestDetail: () => GitLabMergeRequestDC | null;
  readonly onDiscussionCreated: (discussion: GitLabDiscussionDC) => void;
}

export class CreateMrComment {
  @observable accessor isSubmitting = false;
  @observable accessor submitError = "";

  constructor(private readonly options: CreateMrCommentParams) {}

  @computed
  get canComment() {
    return this.options.getMergeRequestDetail()?.diff_refs != null;
  }

  @action.bound
  clearSubmitError() {
    this.submitError = "";
  }

  @action.bound
  async submit(input: CreateDiffCommentInput) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    const diffRefs = this.options.getMergeRequestDetail()?.diff_refs;

    if (!connection || !mr) {
      this.submitError = "Merge request не выбран";
      return false;
    }

    if (!diffRefs?.base_sha || !diffRefs.head_sha || !diffRefs.start_sha) {
      this.submitError = "Нельзя оставить комментарий: нет diff refs";
      return false;
    }

    if (!input.body.trim()) {
      this.submitError = "Введите текст комментария";
      return false;
    }

    this.isSubmitting = true;
    this.submitError = "";

    try {
      const discussion = await gitlabApi.createMergeRequestDiffDiscussion(
        connection,
        mr.project,
        mr.mergeRequestIid,
        {
          base_sha: diffRefs.base_sha,
          head_sha: diffRefs.head_sha,
          start_sha: diffRefs.start_sha,
        },
        {
          ...input,
          body: input.body.trim(),
        },
      );

      this.options.onDiscussionCreated(discussion);

      return true;
    } catch (error) {
      runInAction(() => {
        this.submitError =
          error instanceof Error
            ? error.message
            : "Не удалось отправить комментарий";
      });
      return false;
    } finally {
      runInAction(() => {
        this.isSubmitting = false;
      });
    }
  }
}
