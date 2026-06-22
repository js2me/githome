import { action, computed, observable, reaction, runInAction } from "mobx";
import { gitlabApi } from "@/shared/api/gitlab";
import type {
  GitLabDiscussionDC,
  GitLabMergeRequestApprovalsDC,
  GitLabMergeRequestChangeDC,
  GitLabMergeRequestDC,
  GitLabMergeRequestReviewerDC,
  GitLabMergeRequestVersionDC,
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
import type { Globals } from "@/globals";
import type { GitLabProjectDC } from "@/shared/api/gitlab";
import { CreateMrComment } from "@/features/merge-requests/model/create-mr-comment";
import { MergeRequestGitDiff } from "@/features/merge-requests/model/mr-git-diff";

export type MrReviewAction = "approve" | "unapprove" | "requestChanges" | "cancelRequestChanges";

export type MrInfoModelContext = {
  project: GitLabProjectDC;
  mergeRequestIid: number;
};

export interface MrInfoModelParams {
  globals: Globals;
  readonly abortSignal: AbortSignal;
  readonly params: () => MrInfoModelContext | false;
}

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
  gitDiff: MergeRequestGitDiff;
  diffComment: CreateMrComment;
  mergeRequestDetailQuery;
  mergeRequestDiscussionsQuery;
  currentUserQuery;
  mergeRequestApprovalsQuery;
  mergeRequestReviewersQuery;

  @observable accessor isSubmittingMrComment = false;
  @observable accessor submitMrCommentError = "";
  @observable accessor resolvingDiscussionId = "";
  @observable accessor resolveDiscussionError = "";
  @observable accessor reviewActionInProgress = null as MrReviewAction | null;
  @observable accessor reviewActionError = "";
  @observable accessor locallyCreatedDiscussionsKey = "";
  @observable accessor locallyCreatedDiscussions: GitLabDiscussionDC[] = [];

  constructor(private readonly options: MrInfoModelParams) {
    this.mergeRequestDetailQuery = createGitlabQuery<GitLabMergeRequestDC>({
      globals: options.globals,
      abortSignal: options.abortSignal,
      params: () => {
        const mr = options.params();
        if (!mr) {
          return false;
        }

        return {
          path: `/projects/${mr.project.id}/merge_requests/${mr.mergeRequestIid}`,
        };
      },
    });

    this.gitDiff = new MergeRequestGitDiff({
      globals: options.globals,
      abortSignal: options.abortSignal,
      params: () => options.params(),
    });

    this.diffComment = new CreateMrComment({
      globals: options.globals,
      params: () => options.params(),
      getMergeRequestDetail: () => this.mergeRequestDetail,
      onDiscussionCreated: (discussion) => this.addLocalDiscussion(discussion),
    });

    this.mergeRequestDiscussionsQuery =
      createInfiniteGitlabQuery<GitLabDiscussionDC>({
        globals: options.globals,
        abortSignal: options.abortSignal,
        params: () => {
          const mr = options.params();
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
      globals: options.globals,
      abortSignal: options.abortSignal,
      params: () => {
        if (!options.params()) {
          return false;
        }

        return { path: "/user" };
      },
      select: (data) => (data as GitLabUserDC).id ?? null,
    });

    this.mergeRequestApprovalsQuery = createGitlabQuery<GitLabMergeRequestApprovalsDC>({
      globals: options.globals,
      abortSignal: options.abortSignal,
      params: () => {
        const mr = options.params();
        if (!mr) {
          return false;
        }

        return {
          path: `/projects/${mr.project.id}/merge_requests/${mr.mergeRequestIid}/approvals`,
        };
      },
    });

    this.mergeRequestReviewersQuery = createGitlabQuery<GitLabMergeRequestReviewerDC[]>({
      globals: options.globals,
      abortSignal: options.abortSignal,
      params: () => {
        const mr = options.params();
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
      this.gitDiff.changesQuery,
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
    return this.gitDiff.changes;
  }

  @computed
  get diffVersions(): GitLabMergeRequestVersionDC[] {
    return this.gitDiff.versions;
  }

  @computed
  get selectedDiffVersionId(): number | null {
    return this.gitDiff.selectedVersionId;
  }

  @computed
  get isSubmittingDiffComment() {
    return this.diffComment.isSubmitting;
  }

  @computed
  get submitDiffCommentError() {
    return this.diffComment.submitError;
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
  get changesErrorMessage() {
    return this.gitDiff.errorMessage;
  }

  @computed
  get errorMessage() {
    for (const query of [
      this.mergeRequestDetailQuery,
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
      this.gitDiff.isReady &&
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
      changes: this.mergeRequestChanges ?? [],
      changesError: this.changesErrorMessage,
      discussions: this.mergeRequestDiscussions!,
      approvals: this.mergeRequestApprovals!,
      diffVersions: this.diffVersions,
      selectedDiffVersionId: this.selectedDiffVersionId,
    };
  }

  private get mergeRequestKey() {
    const mr = this.options.params();
    if (!mr) {
      return "";
    }

    return `${mr.project.id}:${mr.mergeRequestIid}`;
  }

  @action.bound
  private addLocalDiscussion(discussion: GitLabDiscussionDC) {
    const localDiscussionsKey = this.mergeRequestKey;
    if (!localDiscussionsKey) {
      return;
    }

    const currentLocalDiscussions =
      this.locallyCreatedDiscussionsKey === localDiscussionsKey
        ? this.locallyCreatedDiscussions
        : [];

    this.locallyCreatedDiscussionsKey = localDiscussionsKey;
    this.locallyCreatedDiscussions = sortMergeRequestDiscussions([
      ...currentLocalDiscussions,
      discussion,
    ]);
  }

  @action.bound
  submitDiffComment(input: CreateDiffCommentInput) {
    return this.diffComment.submit(input);
  }

  @action.bound
  clearSubmitDiffCommentError() {
    this.diffComment.clearSubmitError();
  }

  @action.bound
  async submitMrComment(body: string) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
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
      const createdDiscussion = await gitlabApi.createMergeRequestDiscussion(
        connection,
        mr.project,
        mr.mergeRequestIid,
        body.trim(),
      );

      runInAction(() => {
        this.addLocalDiscussion(createdDiscussion);
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

  @action.bound
  selectDiffVersion(id: number | null) {
    this.gitDiff.selectVersion(id);
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
    await Promise.all([
      this.mergeRequestDetailQuery.refetch(),
      this.gitDiff.invalidate(),
      this.mergeRequestDiscussionsQuery.refetch(),
      this.currentUserQuery.refetch(),
      this.mergeRequestApprovalsQuery.refetch(),
      this.mergeRequestReviewersQuery.refetch(),
    ]);
  }

  private async runReviewAction(
    action: MrReviewAction,
    runner: () => Promise<void>,
  ) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
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
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    const headSha = this.mergeRequestDetail?.diff_refs?.head_sha ?? null;

    if (!connection || !mr) {
      this.reviewActionError = "Merge request не выбран";
      return false;
    }

    return this.runReviewAction("approve", () =>
      gitlabApi.approveMergeRequest(connection, mr.project, mr.mergeRequestIid, {
        sha: headSha,
      }),
    );
  }

  @action.bound
  async unapprove() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.reviewActionError = "Merge request не выбран";
      return false;
    }

    return this.runReviewAction("unapprove", () =>
      gitlabApi.unapproveMergeRequest(connection, mr.project, mr.mergeRequestIid),
    );
  }

  @action.bound
  async requestChanges() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.reviewActionError = "Merge request не выбран";
      return false;
    }

    return this.runReviewAction("requestChanges", () =>
      gitlabApi.requestMergeRequestChanges(
        connection,
        mr.project,
        mr.mergeRequestIid,
      ),
    );
  }

  @action.bound
  async cancelRequestChanges() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.reviewActionError = "Merge request не выбран";
      return false;
    }

    return this.runReviewAction("cancelRequestChanges", () =>
      gitlabApi.cancelMergeRequestRequestedChanges(
        connection,
        mr.project,
        mr.mergeRequestIid,
      ),
    );
  }

  @action.bound
  async resolveDiscussion(discussionId: string, resolved: boolean) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.resolveDiscussionError = "Merge request не выбран";
      return false;
    }

    this.resolvingDiscussionId = discussionId;
    this.resolveDiscussionError = "";

    try {
      await gitlabApi.resolveMergeRequestDiscussion(
        connection,
        mr.project,
        mr.mergeRequestIid,
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
  loadDiffFileContent(filePath: string, ref: string) {
    return this.gitDiff.loadFileContent(filePath, ref);
  }
}
