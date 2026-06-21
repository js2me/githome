import { action, computed, observable, reaction, runInAction } from "mobx";
import { gitlabApi } from "@/shared/api/gitlab";
import type {
  GitLabDiscussionDC,
  GitLabMergeRequestApprovalsDC,
  GitLabMergeRequestChangeDC,
  GitLabMergeRequestDC,
  GitLabMergeRequestReviewerDC,
  GitLabUserDC,
} from "@/shared/api/gitlab";
import type { CreateDiffCommentInput } from "@/shared/lib/gitlab/diff-comment";
import {
  createGitlabQuery,
  createInfiniteGitlabQuery,
} from "@/shared/lib/gitlab/create-query";
import {
  buildMergeRequestApprovalView,
  type MergeRequestApprovalView,
} from "@/shared/lib/gitlab/merge-request-approval-view";
import type { RepositoryModelContext } from "@/pages/repository/model/repository-model-context";

export type MrReviewAction = "approve" | "unapprove" | "requestChanges" | "cancelRequestChanges";

const mergeRequestParams = (ctx: RepositoryModelContext) => {
  const project = ctx.selectedProject;
  const mergeRequestIid = ctx.mergeRequestIid;

  if (!project || mergeRequestIid === null) {
    return false;
  }

  return { project, mergeRequestIid };
};

const selectMergeRequestChanges = (data: unknown): GitLabMergeRequestChangeDC[] => {
  const payload = data as { changes?: GitLabMergeRequestChangeDC[] };
  return payload.changes ?? [];
};

const sortMergeRequestDiscussions = (
  discussions: GitLabDiscussionDC[],
): GitLabDiscussionDC[] => {
  return [...discussions]
    .filter((discussion) => discussion.notes.length > 0)
    .sort((left, right) => {
      const leftTime = new Date(left.notes[0].created_at).getTime();
      const rightTime = new Date(right.notes[0].created_at).getTime();
      return leftTime - rightTime;
    });
};

export class MrInfoModel {
  mergeRequestDetailQuery;
  mergeRequestChangesQuery;
  mergeRequestDiscussionsQuery;
  currentUserQuery;
  mergeRequestApprovalsQuery;
  mergeRequestReviewersQuery;

  @observable accessor isSubmittingDiffComment = false;
  @observable accessor submitDiffCommentError = "";
  @observable accessor isSubmittingMrComment = false;
  @observable accessor submitMrCommentError = "";
  @observable accessor resolvingDiscussionId = "";
  @observable accessor resolveDiscussionError = "";
  @observable accessor reviewActionInProgress = null as MrReviewAction | null;
  @observable accessor reviewActionError = "";
  @observable accessor locallyCreatedDiscussionsKey = "";
  @observable accessor locallyCreatedDiscussions: GitLabDiscussionDC[] = [];

  constructor(private ctx: RepositoryModelContext) {
    this.mergeRequestDetailQuery = createGitlabQuery<GitLabMergeRequestDC>({
      globals: ctx.globals,
      abortSignal: ctx.unmountSignal,
      params: () => {
        const mr = mergeRequestParams(ctx);
        if (!mr) {
          return false;
        }

        return {
          path: `/projects/${mr.project.id}/merge_requests/${mr.mergeRequestIid}`,
        };
      },
    });

    this.mergeRequestChangesQuery = createGitlabQuery<GitLabMergeRequestChangeDC[]>({
      globals: ctx.globals,
      abortSignal: ctx.unmountSignal,
      params: () => {
        const mr = mergeRequestParams(ctx);
        if (!mr) {
          return false;
        }

        return {
          path: `/projects/${mr.project.id}/merge_requests/${mr.mergeRequestIid}/changes`,
          query: {
            access_raw_diffs: true,
            unidiff: true,
          },
        };
      },
      select: selectMergeRequestChanges,
    });

    this.mergeRequestDiscussionsQuery =
      createInfiniteGitlabQuery<GitLabDiscussionDC>({
        globals: ctx.globals,
        abortSignal: ctx.unmountSignal,
        params: () => {
          const mr = mergeRequestParams(ctx);
          if (!mr) {
            return false;
          }

          return {
            path: `/projects/${mr.project.id}/merge_requests/${mr.mergeRequestIid}/discussions`,
            query: {
              per_page: 100,
              sort: "asc",
            },
          };
        },
      });

    reaction(
      () => ({
        hasNextPage: this.mergeRequestDiscussionsQuery.hasNextPage,
        isFetchingNextPage: this.mergeRequestDiscussionsQuery.isFetchingNextPage,
      }),
      ({ hasNextPage, isFetchingNextPage }) => {
        if (hasNextPage && !isFetchingNextPage) {
          void this.mergeRequestDiscussionsQuery.fetchNextPage();
        }
      },
    );

    this.currentUserQuery = createGitlabQuery<number | null>({
      globals: ctx.globals,
      abortSignal: ctx.unmountSignal,
      params: () => {
        if (!mergeRequestParams(ctx)) {
          return false;
        }

        return { path: "/user" };
      },
      select: (data) => (data as GitLabUserDC).id ?? null,
    });

    this.mergeRequestApprovalsQuery = createGitlabQuery<GitLabMergeRequestApprovalsDC>({
      globals: ctx.globals,
      abortSignal: ctx.unmountSignal,
      params: () => {
        const mr = mergeRequestParams(ctx);
        if (!mr) {
          return false;
        }

        return {
          path: `/projects/${mr.project.id}/merge_requests/${mr.mergeRequestIid}/approvals`,
        };
      },
    });

    this.mergeRequestReviewersQuery = createGitlabQuery<GitLabMergeRequestReviewerDC[]>({
      globals: ctx.globals,
      abortSignal: ctx.unmountSignal,
      params: () => {
        const mr = mergeRequestParams(ctx);
        if (!mr) {
          return false;
        }

        return {
          path: `/projects/${mr.project.id}/merge_requests/${mr.mergeRequestIid}/reviewers`,
        };
      },
    });
  }

  private get viewQueries() {
    return [
      this.mergeRequestDetailQuery,
      this.mergeRequestChangesQuery,
      this.mergeRequestDiscussionsQuery,
      this.currentUserQuery,
      this.mergeRequestApprovalsQuery,
      this.mergeRequestReviewersQuery,
    ];
  }

  @computed
  get mergeRequestDetail(): GitLabMergeRequestDC | null {
    return this.mergeRequestDetailQuery.data ?? null;
  }

  @computed
  get mergeRequestChanges(): GitLabMergeRequestChangeDC[] | null {
    return this.mergeRequestChangesQuery.data ?? null;
  }

  @computed
  get mergeRequestDiscussions(): GitLabDiscussionDC[] | null {
    const pages = this.mergeRequestDiscussionsQuery.data?.pages;
    if (!pages) {
      return null;
    }

    const serverDiscussions = sortMergeRequestDiscussions(
      pages.flatMap((page) => page.items),
    );
    const localDiscussions =
      this.locallyCreatedDiscussionsKey === this.mergeRequestKey
        ? this.locallyCreatedDiscussions
        : [];

    if (localDiscussions.length === 0) {
      return serverDiscussions;
    }

    const discussionsById = new Map<string, GitLabDiscussionDC>();

    for (const discussion of [...serverDiscussions, ...localDiscussions]) {
      discussionsById.set(discussion.id, discussion);
    }

    return sortMergeRequestDiscussions([...discussionsById.values()]);
  }

  @computed
  get mergeRequestApprovals(): MergeRequestApprovalView | null {
    if (
      this.currentUserQuery.isLoading ||
      this.mergeRequestApprovalsQuery.isLoading ||
      this.mergeRequestReviewersQuery.isLoading
    ) {
      return null;
    }

    return buildMergeRequestApprovalView(
      this.currentUserQuery.error ? null : (this.currentUserQuery.data ?? null),
      this.mergeRequestApprovalsQuery.error
        ? null
        : (this.mergeRequestApprovalsQuery.data ?? null),
      this.mergeRequestReviewersQuery.error
        ? []
        : (this.mergeRequestReviewersQuery.data ?? []),
    );
  }

  @computed
  get isLoading() {
    return this.viewQueries.some(
      (query) => query.isLoading || query.isFetching,
    );
  }

  @computed
  get errorMessage() {
    for (const query of [
      this.mergeRequestDetailQuery,
      this.mergeRequestChangesQuery,
      this.mergeRequestDiscussionsQuery,
    ]) {
      const error = query.error;
      if (!error) {
        continue;
      }

      return error instanceof Error
        ? error.message
        : "Не удалось загрузить merge request";
    }

    return null;
  }

  @computed
  get showLoadError() {
    return Boolean(this.errorMessage) && !this.isLoading;
  }

  @computed
  get isDetailReady() {
    return (
      !this.isLoading &&
      !this.errorMessage &&
      this.mergeRequestDetail !== null &&
      this.mergeRequestChanges !== null &&
      this.mergeRequestDiscussions !== null &&
      this.mergeRequestApprovals !== null
    );
  }

  @computed
  get detailView() {
    if (!this.isDetailReady) {
      return null;
    }

    return {
      mergeRequest: this.mergeRequestDetail!,
      changes: this.mergeRequestChanges!,
      discussions: this.mergeRequestDiscussions!,
      approvals: this.mergeRequestApprovals!,
    };
  }

  private get mergeRequestKey() {
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;

    if (!project || mergeRequestIid === null) {
      return "";
    }

    return `${project.id}:${mergeRequestIid}`;
  }

  @action.bound
  async submitDiffComment(input: CreateDiffCommentInput) {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;
    const diffRefs = this.mergeRequestDetail?.diff_refs;

    if (!connection || !project || mergeRequestIid === null) {
      this.submitDiffCommentError = "Merge request не выбран";
      return false;
    }

    if (!diffRefs?.base_sha || !diffRefs.head_sha || !diffRefs.start_sha) {
      this.submitDiffCommentError = "Нельзя оставить комментарий: нет diff refs";
      return false;
    }

    if (!input.body.trim()) {
      this.submitDiffCommentError = "Введите текст комментария";
      return false;
    }

    this.isSubmittingDiffComment = true;
    this.submitDiffCommentError = "";

    try {
      const localDiscussionsKey = `${project.id}:${mergeRequestIid}`;
      const createdDiscussion = await gitlabApi.createMergeRequestDiffDiscussion(
        connection,
        project,
        mergeRequestIid,
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

      runInAction(() => {
        const currentLocalDiscussions =
          this.locallyCreatedDiscussionsKey === localDiscussionsKey
            ? this.locallyCreatedDiscussions
            : [];

        this.locallyCreatedDiscussionsKey = localDiscussionsKey;
        this.locallyCreatedDiscussions = sortMergeRequestDiscussions([
          ...currentLocalDiscussions,
          createdDiscussion,
        ]);
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

  @action.bound
  clearSubmitDiffCommentError() {
    this.submitDiffCommentError = "";
  }

  @action.bound
  async submitMrComment(body: string) {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;

    if (!connection || !project || mergeRequestIid === null) {
      this.submitMrCommentError = "Merge request не выбран";
      return false;
    }

    if (!body.trim()) {
      this.submitMrCommentError = "Введите текст комментария";
      return false;
    }

    this.isSubmittingMrComment = true;
    this.submitMrCommentError = "";

    try {
      const localDiscussionsKey = `${project.id}:${mergeRequestIid}`;
      const createdDiscussion = await gitlabApi.createMergeRequestDiscussion(
        connection,
        project,
        mergeRequestIid,
        body.trim(),
      );

      runInAction(() => {
        const currentLocalDiscussions =
          this.locallyCreatedDiscussionsKey === localDiscussionsKey
            ? this.locallyCreatedDiscussions
            : [];

        this.locallyCreatedDiscussionsKey = localDiscussionsKey;
        this.locallyCreatedDiscussions = sortMergeRequestDiscussions([
          ...currentLocalDiscussions,
          createdDiscussion,
        ]);
      });

      return true;
    } catch (error) {
      runInAction(() => {
        this.submitMrCommentError =
          error instanceof Error
            ? error.message
            : "Не удалось отправить комментарий";
      });
      return false;
    } finally {
      runInAction(() => {
        this.isSubmittingMrComment = false;
      });
    }
  }

  @action.bound
  clearSubmitMrCommentError() {
    this.submitMrCommentError = "";
  }

  @action
  clearResolveDiscussionError() {
    this.resolveDiscussionError = "";
  }

  @action
  clearReviewActionError() {
    this.reviewActionError = "";
  }

  private async invalidateMergeRequestView() {
    await Promise.all(this.viewQueries.map((query) => query.refetch()));
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
    this.reviewActionError = "";

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

  @action.bound
  async approve() {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;
    const headSha = this.mergeRequestDetail?.diff_refs?.head_sha ?? null;

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

  @action.bound
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

  @action.bound
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

  @action.bound
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

  @action.bound
  async resolveDiscussion(discussionId: string, resolved: boolean) {
    const connection = this.ctx.globals.stores.settings.activeConnection;
    const project = this.ctx.selectedProject;
    const mergeRequestIid = this.ctx.mergeRequestIid;

    if (!connection || !project || mergeRequestIid === null) {
      this.resolveDiscussionError = "Merge request не выбран";
      return false;
    }

    this.resolvingDiscussionId = discussionId;
    this.resolveDiscussionError = "";

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
        this.resolvingDiscussionId = "";
      });
    }
  }

  @action.bound
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
