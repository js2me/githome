import {
  action,
  actionBound,
  computed,
  observable,
  reaction,
  runInAction,
} from 'mobx';
import { queryClient } from 'mobx-tanstack-query/preset';
import { mergeRequestDetailKey } from '@/entities/gitlab-merge-requests';
import {
  CreateMrComment,
  MergeRequestGitDiff,
} from '@/features/merge-requests';
import type {
  GitLabDiscussionDC,
  GitLabMergeRequestApprovalsDC,
  GitLabMergeRequestChangeDC,
  GitLabMergeRequestDC,
  GitLabMergeRequestReviewerDC,
  GitLabMergeRequestVersionDC,
  GitLabProjectDC,
} from '@/shared/api/gitlab';
import { gitlabApi, resolveGitlabRequestUrl } from '@/shared/api/gitlab';
import type { GitLabMergeInput } from '@/shared/api/gitlab/endpoints/merge-requests/lifecycle/merge-merge-request';
import { createConnectionUserIdQuery } from '@/shared/lib/gitlab/connection/connection-profile-query';
import {
  createGitlabApiQuery,
  createGitlabQuery,
  createInfiniteGitlabQuery,
} from '@/shared/lib/gitlab/connection/create-query';
import type { CreateDiffCommentInput } from '@/shared/lib/gitlab/discussions/diff-comment';
import {
  buildMergeRequestApprovalView,
  type MergeRequestApprovalView,
} from '@/shared/lib/gitlab/merge-request-approval-view';
import { t } from '@/shared/lib/i18n';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import type { Globals } from '@/shared/model/globals';
import { ReviewedFiles } from './changes/reviewed-files/reviewed-files';
import { MergeRequestReactions } from './reactions/merge-request-reactions';

export type MrReviewAction =
  | 'approve'
  | 'unapprove'
  | 'requestChanges'
  | 'cancelRequestChanges';

export type MrAction = MrReviewAction | 'close' | 'merge' | 'cancelMerge';

export type MrInfoModelContext = {
  project: GitLabProjectDC;
  mergeRequestIid: number;
};

type MergeRequestTarget = {
  projectId: number;
  mergeRequestIid: number;
};

export interface MrInfoModelParams {
  globals: Globals;
  readonly abortSignal: AbortSignal;
  readonly target: () => MergeRequestTarget | false;
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
  readonly reviewedFiles: ReviewedFiles;
  readonly reactions: MergeRequestReactions;
  mergeRequestDetailQuery;
  mergeRequestDiscussionsQuery;
  currentUserQuery;
  mergeRequestApprovalsQuery;
  mergeRequestReviewersQuery;

  @observable accessor isSubmittingMrComment = false;
  @observable private accessor submitMrCommentErrorValue: Error | null = null;

  get submitMrCommentError() {
    return this.submitMrCommentErrorValue?.message ?? '';
  }
  @observable accessor resolvingDiscussionId = '';
  @observable private accessor resolveDiscussionErrorValue: Error | null = null;

  get resolveDiscussionError() {
    return this.resolveDiscussionErrorValue?.message ?? '';
  }
  @observable accessor replyingDiscussionId = '';
  @observable accessor replyDiscussionErrorKey = '';
  @observable private accessor replyDiscussionErrorValue: Error | null = null;

  get replyDiscussionError() {
    return this.replyDiscussionErrorValue?.message ?? '';
  }
  @observable accessor updatingNoteKey = '';
  @observable private accessor updateNoteErrorValue: Error | null = null;

  get updateNoteError() {
    return this.updateNoteErrorValue?.message ?? '';
  }
  @observable accessor deletingNoteKey = '';
  @observable accessor deleteNoteErrorKey = '';
  @observable private accessor deleteNoteErrorValue: Error | null = null;

  get deleteNoteError() {
    return this.deleteNoteErrorValue?.message ?? '';
  }
  @observable accessor actionInProgress = null as MrAction | null;
  @observable private accessor failedAction: MrAction | null = null;
  @observable private accessor actionErrorValue: Error | null = null;

  get reviewActionError() {
    return this.failedAction === 'close' ||
      this.failedAction === 'merge' ||
      this.failedAction === 'cancelMerge'
      ? ''
      : (this.actionErrorValue?.message ?? '');
  }

  get lifecycleActionError() {
    return this.failedAction === 'close'
      ? (this.actionErrorValue?.message ?? '')
      : '';
  }
  get mergeActionError() {
    return this.failedAction === 'merge' || this.failedAction === 'cancelMerge'
      ? (this.actionErrorValue?.message ?? '')
      : '';
  }

  @actionBound
  clearMergeActionError() {
    if (this.failedAction === 'merge' || this.failedAction === 'cancelMerge') {
      this.failedAction = null;
      this.actionErrorValue = null;
    }
  }

  @observable accessor locallyCreatedDiscussionsKey = '';
  @observable accessor locallyCreatedDiscussions: GitLabDiscussionDC[] = [];

  constructor(private readonly options: MrInfoModelParams) {
    this.mergeRequestDetailQuery = createGitlabApiQuery<
      GitLabMergeRequestDC,
      MergeRequestTarget
    >({
      globals: options.globals,
      abortSignal: options.abortSignal,
      queryOptions: {
        ...MR_POLL_QUERY_OPTIONS,
        // The open-by-link flow may have just fetched this exact MR.
        staleTime: 10_000,
        refetchOnWindowFocus: true,
      },
      params: options.target,
      queryKey: ({ connection, projectId, mergeRequestIid }) =>
        mergeRequestDetailKey(connection, projectId, mergeRequestIid),
      queryFn: ({ connection, projectId, mergeRequestIid, signal }) =>
        gitlabApi.getMergeRequestDetail(
          connection,
          projectId,
          mergeRequestIid,
          signal,
        ),
    });

    this.gitDiff = new MergeRequestGitDiff({
      globals: options.globals,
      abortSignal: options.abortSignal,
      params: () => options.params(),
      getMergeRequestDetail: () => this.mergeRequestDetail,
    });

    this.diffComment = new CreateMrComment({
      globals: options.globals,
      params: () => options.params(),
      getDiffRefs: () => {
        const version = this.gitDiff.selectedVersion;
        return version
          ? {
              base_sha: version.base_commit_sha,
              head_sha: version.head_commit_sha,
              start_sha: version.start_commit_sha,
            }
          : this.mergeRequestDetail?.diff_refs;
      },
      onDiscussionCreated: (discussion) => this.addLocalDiscussion(discussion),
    });

    this.mergeRequestDiscussionsQuery =
      createInfiniteGitlabQuery<GitLabDiscussionDC>({
        globals: options.globals,
        abortSignal: options.abortSignal,
        queryOptions: MR_POLL_QUERY_OPTIONS,
        params: () => {
          const mr = options.target();
          if (!mr) {
            return false;
          }

          return {
            path: `/projects/${mr.projectId}/merge_requests/${mr.mergeRequestIid}/discussions`,
            query: {
              per_page: 100,
              sort: 'asc',
            },
          };
        },
      });

    reaction(
      () => ({
        hasNextPage: this.mergeRequestDiscussionsQuery.hasNextPage,
        isFetchingNextPage:
          this.mergeRequestDiscussionsQuery.isFetchingNextPage,
      }),
      ({ hasNextPage, isFetchingNextPage }) => {
        if (hasNextPage && !isFetchingNextPage) {
          void this.mergeRequestDiscussionsQuery.fetchNextPage();
        }
      },
    );

    this.currentUserQuery = createConnectionUserIdQuery(
      () =>
        options.target()
          ? options.globals.stores.settings.activeConnection
          : null,
      options.abortSignal,
    );

    this.reactions = new MergeRequestReactions({
      globals: options.globals,
      abortSignal: options.abortSignal,
      target: options.target,
      currentUserId: () => this.currentUserId,
    });
    this.reviewedFiles = new ReviewedFiles(this, options);

    this.mergeRequestApprovalsQuery =
      createGitlabQuery<GitLabMergeRequestApprovalsDC>({
        globals: options.globals,
        abortSignal: options.abortSignal,
        queryOptions: MR_POLL_QUERY_OPTIONS,
        params: () => {
          const mr = options.target();
          if (!mr) {
            return false;
          }

          return {
            path: `/projects/${mr.projectId}/merge_requests/${mr.mergeRequestIid}/approvals`,
          };
        },
      });

    this.mergeRequestReviewersQuery = createGitlabQuery<
      GitLabMergeRequestReviewerDC[]
    >({
      globals: options.globals,
      abortSignal: options.abortSignal,
      queryOptions: MR_POLL_QUERY_OPTIONS,
      params: () => {
        const mr = options.target();
        if (!mr) {
          return false;
        }

        return {
          path: `/projects/${mr.projectId}/merge_requests/${mr.mergeRequestIid}/reviewers`,
        };
      },
    });
  }

  private get viewQueries() {
    return [
      this.mergeRequestDetailQuery,
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
    return this.currentUserQuery.error
      ? null
      : (this.currentUserQuery.data ?? null);
  }

  @computed
  get mergeRequestApprovals(): MergeRequestApprovalView | null {
    const approvalQueries = [
      this.currentUserQuery,
      this.mergeRequestApprovalsQuery,
      this.mergeRequestReviewersQuery,
    ];

    if (approvalQueries.some((query) => !query.isFetched && query.isPending)) {
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
    return (
      !this.mergeRequestDetailQuery.isFetched &&
      this.mergeRequestDetailQuery.isPending
    );
  }

  @computed
  get isRefreshing() {
    return (
      this.viewQueries.some((query) => query.isFetching) ||
      this.gitDiff.changesQuery.isFetching
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
        : t('review.couldNotLoadTheMergeRequest');
    }

    return null;
  }

  @computed
  get showLoadError() {
    return Boolean(this.errorMessage) && !this.isLoading;
  }

  @computed
  get detailView() {
    const mergeRequest = this.mergeRequestDetail;
    if (!mergeRequest) return null;

    const version = this.gitDiff.selectedVersion;
    return {
      mergeRequest,
      headRef: version
        ? version.head_commit_sha
        : mergeRequest.diff_refs?.head_sha,
      baseRef: version
        ? version.base_commit_sha || version.start_commit_sha
        : mergeRequest.diff_refs?.base_sha || mergeRequest.diff_refs?.start_sha,
      changes: this.mergeRequestChanges ?? [],
      changesError: this.changesErrorMessage,
      discussions: this.mergeRequestDiscussions,
      approvals: this.mergeRequestApprovals,
      diffVersions: this.diffVersions,
      selectedDiffVersionId: this.selectedDiffVersionId,
      selectedDiffVersion: this.gitDiff.selectedVersion,
      diffRevision: this.gitDiff.revision,
      isPreparingDiffs: this.gitDiff.isLoading,
      canCommentOnDiff:
        this.mergeRequestChanges !== null && this.diffComment.canComment,
    };
  }

  private get mergeRequestKey() {
    const mr = this.options.params();
    if (!mr) {
      return '';
    }

    return `${mr.project.id}:${mr.mergeRequestIid}`;
  }

  @actionBound
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

  @actionBound
  async submitDiffComment(input: CreateDiffCommentInput) {
    return this.mergeRequestChanges === null
      ? false
      : this.diffComment.submit(input);
  }

  @actionBound
  clearSubmitDiffCommentError() {
    this.diffComment.clearSubmitError();
  }

  @actionBound
  async submitMrComment(body: string) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.submitMrCommentErrorValue = new LocalizedError(
        'review.noMergeRequestSelected',
      );
      return false;
    }

    if (!body.trim()) {
      this.submitMrCommentErrorValue = new LocalizedError(
        'review.enterAComment',
      );
      return false;
    }

    this.isSubmittingMrComment = true;
    this.submitMrCommentErrorValue = null;

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
        this.submitMrCommentErrorValue =
          error instanceof Error
            ? error
            : new LocalizedError('review.couldNotPostTheComment');
      });
      return false;
    } finally {
      runInAction(() => {
        this.isSubmittingMrComment = false;
      });
    }
  }

  @actionBound
  clearSubmitMrCommentError() {
    this.submitMrCommentErrorValue = null;
  }

  @actionBound
  selectDiffVersion(id: number | null) {
    this.gitDiff.selectVersion(id);
  }

  @action
  clearResolveDiscussionError() {
    this.resolveDiscussionErrorValue = null;
  }

  @actionBound
  clearReplyDiscussionError() {
    this.replyDiscussionErrorKey = '';
    this.replyDiscussionErrorValue = null;
  }

  @actionBound
  async replyToDiscussion(discussionId: string, body: string) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    const trimmedBody = body.trim();

    this.replyDiscussionErrorKey = discussionId;
    this.replyDiscussionErrorValue = null;

    if (!connection || !mr) {
      this.replyDiscussionErrorValue = new LocalizedError(
        'review.noMergeRequestSelected',
      );
      return false;
    }

    if (!trimmedBody) {
      this.replyDiscussionErrorValue = new LocalizedError('review.enterAReply');
      return false;
    }

    this.replyingDiscussionId = discussionId;

    try {
      await gitlabApi.createMergeRequestDiscussionNote(
        connection,
        mr.project,
        mr.mergeRequestIid,
        discussionId,
        trimmedBody,
      );

      await this.refreshDiscussions();
      this.clearReplyDiscussionError();
      return true;
    } catch (error) {
      runInAction(() => {
        this.replyDiscussionErrorValue =
          error instanceof Error
            ? error
            : new LocalizedError('review.couldNotPostTheReply');
      });
      return false;
    } finally {
      runInAction(() => {
        this.replyingDiscussionId = '';
      });
    }
  }

  @actionBound
  clearUpdateNoteError() {
    this.updateNoteErrorValue = null;
  }

  @actionBound
  clearDeleteNoteError() {
    this.deleteNoteErrorKey = '';
    this.deleteNoteErrorValue = null;
  }

  @action
  resetMrAction() {
    this.actionInProgress = null;
    this.failedAction = null;
    this.actionErrorValue = null;
  }

  private refreshDiscussions() {
    return this.mergeRequestDiscussionsQuery.invalidate();
  }

  refreshMetadata() {
    return Promise.all([
      this.mergeRequestDetailQuery.invalidate(),
      this.mergeRequestReviewersQuery.invalidate(),
      this.mergeRequestApprovalsQuery.invalidate(),
      this.mergeRequestDiscussionsQuery.invalidate(),
    ]);
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

  private async runMrAction(
    action: MrAction,
    runner: () => Promise<void | Partial<GitLabMergeRequestDC>>,
  ) {
    if (this.actionInProgress) return false;

    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.failedAction = action;
      this.actionErrorValue = new LocalizedError(
        'review.noMergeRequestSelected',
      );
      return false;
    }

    const actionMergeRequestKey = `${mr.project.id}:${mr.mergeRequestIid}`;
    const isCurrent = () => {
      const active = this.options.globals.stores.settings.activeConnection;
      return (
        active?.id === connection.id &&
        active.gitlabUrl === connection.gitlabUrl &&
        active.credentialsRevision === connection.credentialsRevision &&
        this.mergeRequestKey === actionMergeRequestKey
      );
    };
    this.actionInProgress = action;
    this.actionErrorValue = null;

    try {
      const updated = await runner();
      if (updated) {
        const key = mergeRequestDetailKey(
          connection,
          mr.project.id,
          mr.mergeRequestIid,
        );
        queryClient.setQueryData<GitLabMergeRequestDC>(key, (current) =>
          current ? { ...current, ...updated } : undefined,
        );
        const listPath = resolveGitlabRequestUrl(
          connection.gitlabUrl,
          `/api/v4/projects/${mr.project.id}/merge_requests`,
        );
        void queryClient.invalidateQueries({ queryKey: listPath.split('/') });
        if (!isCurrent()) {
          void queryClient.invalidateQueries({ queryKey: key, exact: true });
        }
      }

      if (!isCurrent()) {
        return true;
      }

      await this.invalidateMergeRequestView();
      return true;
    } catch (error) {
      runInAction(() => {
        if (isCurrent()) {
          this.failedAction = action;
          this.actionErrorValue =
            error instanceof Error
              ? error
              : new LocalizedError('common.couldNotCompleteTheAction');
        }
      });
      return false;
    } finally {
      runInAction(() => {
        if (isCurrent()) {
          this.actionInProgress = null;
        }
      });
    }
  }

  get mergeContext() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    return connection && mr ? { connection, ...mr } : null;
  }

  @actionBound
  async merge(input: GitLabMergeInput) {
    const context = this.mergeContext;
    const mr = this.mergeRequestDetail;
    if (
      !context ||
      mr?.state !== 'opened' ||
      mr.draft ||
      mr.work_in_progress ||
      !input.sha
    )
      return false;

    return this.runMrAction('merge', () =>
      gitlabApi.mergeMergeRequest(
        context.connection,
        context.project.path_with_namespace,
        context.mergeRequestIid,
        input,
      ),
    );
  }

  @actionBound
  async cancelMerge() {
    const context = this.mergeContext;
    if (!context || this.mergeRequestDetail?.state !== 'opened') return false;
    return this.runMrAction('cancelMerge', () =>
      gitlabApi.cancelAutoMerge(
        context.connection,
        context.project.id,
        context.mergeRequestIid,
      ),
    );
  }

  @actionBound
  async close() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    if (!connection || !mr || this.mergeRequestDetail?.state !== 'opened')
      return false;

    return this.runMrAction('close', () =>
      gitlabApi.closeMergeRequest(
        connection,
        mr.project.id,
        mr.mergeRequestIid,
      ),
    );
  }

  @actionBound
  async approve() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    const headSha = this.mergeRequestDetail?.diff_refs?.head_sha ?? null;

    if (!connection || !mr) {
      this.actionErrorValue = new LocalizedError(
        'review.noMergeRequestSelected',
      );
      return false;
    }

    return this.runMrAction('approve', () =>
      gitlabApi.approveMergeRequest(
        connection,
        mr.project,
        mr.mergeRequestIid,
        {
          sha: headSha,
        },
      ),
    );
  }

  @actionBound
  async unapprove() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.actionErrorValue = new LocalizedError(
        'review.noMergeRequestSelected',
      );
      return false;
    }

    return this.runMrAction('unapprove', () =>
      gitlabApi.unapproveMergeRequest(
        connection,
        mr.project,
        mr.mergeRequestIid,
      ),
    );
  }

  @actionBound
  async requestChanges() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.actionErrorValue = new LocalizedError(
        'review.noMergeRequestSelected',
      );
      return false;
    }

    return this.runMrAction('requestChanges', () =>
      gitlabApi.requestMergeRequestChanges(
        connection,
        mr.project,
        mr.mergeRequestIid,
      ),
    );
  }

  @actionBound
  async cancelRequestChanges() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.actionErrorValue = new LocalizedError(
        'review.noMergeRequestSelected',
      );
      return false;
    }

    return this.runMrAction('cancelRequestChanges', () =>
      gitlabApi.cancelMergeRequestRequestedChanges(
        connection,
        mr.project,
        mr.mergeRequestIid,
      ),
    );
  }

  @actionBound
  async resolveDiscussion(discussionId: string, resolved: boolean) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.resolveDiscussionErrorValue = new LocalizedError(
        'review.noMergeRequestSelected',
      );
      return false;
    }

    this.resolvingDiscussionId = discussionId;
    this.resolveDiscussionErrorValue = null;

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
        this.resolveDiscussionErrorValue =
          error instanceof Error
            ? error
            : new LocalizedError('review.couldNotUpdateTheThreadStatus');
      });
      return false;
    } finally {
      runInAction(() => {
        this.resolvingDiscussionId = '';
      });
    }
  }

  @actionBound
  async updateDiscussionNote(
    discussionId: string,
    noteId: number,
    body: string,
  ) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      this.updateNoteErrorValue = new LocalizedError(
        'review.noMergeRequestSelected',
      );
      return false;
    }

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      this.updateNoteErrorValue = new LocalizedError('review.enterAComment');
      return false;
    }

    const noteKey = `${discussionId}:${noteId}`;
    this.updatingNoteKey = noteKey;
    this.updateNoteErrorValue = null;

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
        this.updateNoteErrorValue =
          error instanceof Error
            ? error
            : new LocalizedError('review.couldNotUpdateTheComment');
      });
      return false;
    } finally {
      runInAction(() => {
        this.updatingNoteKey = '';
      });
    }
  }

  @actionBound
  async deleteDiscussionNote(discussionId: string, noteId: number) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    const noteKey = `${discussionId}:${noteId}`;

    this.deleteNoteErrorKey = noteKey;
    this.deleteNoteErrorValue = null;

    if (!connection || !mr) {
      this.deleteNoteErrorValue = new LocalizedError(
        'review.noMergeRequestSelected',
      );
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
        this.deleteNoteErrorValue =
          error instanceof Error
            ? error
            : new LocalizedError('review.couldNotDeleteTheComment');
      });
      return false;
    } finally {
      runInAction(() => {
        this.deletingNoteKey = '';
      });
    }
  }

  @actionBound
  loadDiffFileContent(filePath: string, ref: string) {
    return this.gitDiff.loadFileContent(filePath, ref);
  }
}
