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

const MR_POLL_INTERVAL_MS = 20_000;
const MR_POLL_QUERY_OPTIONS = {
  refetchInterval: MR_POLL_INTERVAL_MS,
} as const;

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
  @observable accessor updatingNoteKey = "";
  @observable accessor updateNoteError = "";
  @observable accessor deletingNoteKey = "";
  @observable accessor deleteNoteErrorKey = "";
  @observable accessor deleteNoteError = "";
  @observable accessor reviewActionInProgress = null as MrReviewAction | null;
  @observable accessor reviewActionError = "";
  @observable accessor locallyCreatedDiscussionsKey = "";
  @observable accessor locallyCreatedDiscussions: GitLabDiscussionDC[] = [];

  constructor(private readonly options: MrInfoModelParams) {
    this.mergeRequestDetailQuery = createGitlabQuery<GitLabMergeRequestDC>({
      globals: options.globals,
      abortSignal: options.abortSignal,
      queryOptions: MR_POLL_QUERY_OPTIONS,
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
        queryOptions: MR_POLL_QUERY_OPTIONS,
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
      queryOptions: {
        select: (data) => (data as GitLabUserDC).id ?? null,
      },
    });

    this.mergeRequestApprovalsQuery = createGitlabQuery<GitLabMergeRequestApprovalsDC>({
      globals: options.globals,
      abortSignal: options.abortSignal,
      queryOptions: MR_POLL_QUERY_OPTIONS,
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
      queryOptions: MR_POLL_QUERY_OPTIONS,
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
      if (!this.mergeRequestDiscussionsQuery.isFetched) {
        return null;
      }

      return [];
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
  get currentUserId(): number | null {
    return this.currentUserQuery.error ? null : (this.currentUserQuery.data ?? null);
  }

  @computed
  get mergeRequestApprovals(): MergeRequestApprovalView | null {
    const approvalQueries = [
      this.currentUserQuery,
      this.mergeRequestApprovalsQuery,
      this.mergeRequestReviewersQuery,
    ];

    if (
      approvalQueries.some((query) => !query.isFetched && query.isPending)
    ) {
      return null;
    }

    return buildMergeRequestApprovalView(
      this.currentUserId,
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
      (query) => !query.isFetched && query.isPending,
    );
  }

  @computed
  get isRefreshing() {
    return this.viewQueries.some((query) => query.isFetching);
  }

  @computed
  get showPreparingDiffs() {
    return (
      this.gitDiff.isLoading &&
      !this.viewQueries.some((query) => !query.isFetched && query.isPending)
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
  clearUpdateNoteError() {
    this.updateNoteError = "";
  }

  @action.bound
  clearDeleteNoteError() {
    this.deleteNoteErrorKey = "";
    this.deleteNoteError = "";
  }

  @action
  clearReviewActionError() {
    this.reviewActionError = "";
  }

  private refreshDiscussions() {
    return this.mergeRequestDiscussionsQuery.invalidate();
  }

  private invalidateMergeRequestView() {
    return Promise.all([
      this.mergeRequestDetailQuery.invalidate(),
      this.gitDiff.invalidate(),
      this.mergeRequestDiscussionsQuery.invalidate(),
      this.currentUserQuery.invalidate(),
      this.mergeRequestApprovalsQuery.invalidate(),
      this.mergeRequestReviewersQuery.invalidate(),
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

      await this.refreshDiscussions();

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
  async updateDiscussionNote(
    discussionId: string,
    noteId: number,
    body: string,
  ) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.updateNoteError = "Merge request не выбран";
      return false;
    }

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      this.updateNoteError = "Введите текст комментария";
      return false;
    }

    const noteKey = `${discussionId}:${noteId}`;
    this.updatingNoteKey = noteKey;
    this.updateNoteError = "";

    try {
      await gitlabApi.updateMergeRequestDiscussionNote(
        connection,
        mr.project,
        mr.mergeRequestIid,
        discussionId,
        noteId,
        trimmedBody,
      );

      await this.refreshDiscussions();

      return true;
    } catch (error) {
      runInAction(() => {
        this.updateNoteError =
          error instanceof Error
            ? error.message
            : "Не удалось обновить комментарий";
      });
      return false;
    } finally {
      runInAction(() => {
        this.updatingNoteKey = "";
      });
    }
  }

  @action.bound
  async deleteDiscussionNote(discussionId: string, noteId: number) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    const noteKey = `${discussionId}:${noteId}`;

    this.deleteNoteErrorKey = noteKey;
    this.deleteNoteError = "";

    if (!connection || !mr) {
      this.deleteNoteError = "Merge request не выбран";
      return false;
    }

    this.deletingNoteKey = noteKey;

    try {
      await gitlabApi.deleteMergeRequestDiscussionNote(
        connection,
        mr.project,
        mr.mergeRequestIid,
        discussionId,
        noteId,
      );

      runInAction(() => {
        this.locallyCreatedDiscussions = this.locallyCreatedDiscussions.flatMap(
          (discussion) => {
            if (discussion.id !== discussionId) {
              return [discussion];
            }

            const notes = discussion.notes.filter((note) => note.id !== noteId);
            return notes.length > 0 ? [{ ...discussion, notes }] : [];
          },
        );
      });

      await this.refreshDiscussions();
      this.clearDeleteNoteError();
      return true;
    } catch (error) {
      runInAction(() => {
        this.deleteNoteError =
          error instanceof Error
            ? error.message
            : "Не удалось удалить комментарий";
      });
      return false;
    } finally {
      runInAction(() => {
        this.deletingNoteKey = "";
      });
    }
  }

  @action.bound
  loadDiffFileContent(filePath: string, ref: string) {
    return this.gitDiff.loadFileContent(filePath, ref);
  }
}
