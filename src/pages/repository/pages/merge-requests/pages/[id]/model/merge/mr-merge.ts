import {
  actionBound,
  computed,
  observable,
  observableRef,
  runInAction,
} from 'mobx';
import { createRef } from 'yummies/mobx';
import { gitlabApi } from '@/shared/api/gitlab';
import type { GitLabMergeOptions } from '@/shared/api/gitlab/endpoints/merge-requests/lifecycle/merge-options';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import type { MrInfoModel } from '../mr-info';
import { mergeMode } from './strategy';

export class MrMerge {
  readonly dialog = createRef<HTMLDialogElement>();
  @observableRef accessor options: GitLabMergeOptions | null = null;
  @observable accessor isLoading = false;
  @observable accessor squash = false;
  @observable accessor removeSourceBranch = false;
  @observable accessor commitMessage = '';
  @observable accessor squashMessage = '';
  @observable private accessor outcome: 'sent' | 'cancelled' | null = null;
  @observableRef private accessor loadError: Error | null = null;
  private optionsRequest?: AbortController;
  @observable private accessor scope = '';

  constructor(
    private readonly info: MrInfoModel,
    signal: AbortSignal,
  ) {
    signal.addEventListener('abort', () => this.optionsRequest?.abort(), {
      once: true,
    });
  }

  private get currentScope() {
    const context = this.info.mergeContext;
    if (!context) return '';
    const { connection, project, mergeRequestIid } = context;
    return JSON.stringify([
      connection.id,
      connection.gitlabUrl,
      connection.credentialsRevision,
      project.id,
      mergeRequestIid,
    ]);
  }

  @computed
  get busy() {
    return this.info.actionInProgress !== null;
  }

  @computed
  get result() {
    return this.scope === this.currentScope ? this.outcome : null;
  }

  @computed
  get scheduled() {
    return this.info.mergeRequestDetail?.merge_when_pipeline_succeeds === true;
  }

  @computed
  get canOpen() {
    const mr = this.info.mergeRequestDetail;
    return Boolean(
      this.info.mergeContext &&
        mr?.state === 'opened' &&
        !this.busy &&
        (this.scheduled ||
          (!mr.draft && !mr.work_in_progress && mr.user?.can_merge !== false)),
    );
  }

  @computed
  get mode() {
    return mergeMode(this.options);
  }

  @computed
  get canEditSquashMessage() {
    return this.squash && (this.options?.commitCount ?? 0) > 1;
  }

  @computed
  get error() {
    return (
      this.loadError?.message ||
      this.info.mergeActionError ||
      this.info.mergeRequestDetail?.merge_error ||
      this.options?.mergeError ||
      ''
    );
  }

  @actionBound
  async open() {
    if (!this.canOpen) return;
    this.dialog.current?.showModal();
    await this.load();
  }

  @actionBound
  async load() {
    const context = this.info.mergeContext;
    if (!context || this.busy) return;

    this.optionsRequest?.abort();
    const request = new AbortController();
    this.optionsRequest = request;
    this.scope = this.currentScope;
    this.options = null;
    this.outcome = null;
    this.loadError = null;
    this.info.clearMergeActionError();
    this.isLoading = true;
    try {
      const options = await gitlabApi.getMergeOptions(
        context.connection,
        context.project.path_with_namespace,
        context.mergeRequestIid,
        request.signal,
      );
      if (request.signal.aborted || this.scope !== this.currentScope) return;
      runInAction(() => {
        this.options = options;
        this.squash = options.squashOnMerge;
        this.removeSourceBranch = Boolean(
          options.shouldRemoveSourceBranch || options.forceRemoveSourceBranch,
        );
        this.commitMessage = options.defaultMergeCommitMessage ?? '';
        this.squashMessage = options.defaultSquashCommitMessage ?? '';
      });
    } catch (error) {
      if (request.signal.aborted) return;
      runInAction(() => {
        this.loadError =
          error instanceof Error
            ? error
            : new LocalizedError('review.couldNotLoadMergeOptions');
      });
    } finally {
      if (request === this.optionsRequest)
        runInAction(() => {
          this.isLoading = false;
        });
    }
  }

  @actionBound
  close() {
    if (!this.busy) this.dialog.current?.close();
  }

  @actionBound
  onClosed() {
    this.optionsRequest?.abort();
    this.optionsRequest = undefined;
    this.isLoading = false;
  }

  @actionBound
  async confirm() {
    const { options, mode } = this;
    const scope = this.scope;
    if (!options || this.busy || scope !== this.currentScope) return;
    if (options.autoMergeEnabled) {
      if (await this.info.cancelMerge()) this.complete(scope, 'cancelled');
      return;
    }
    if (!mode || !options.diffHeadSha) return;
    const squash = options.squashReadOnly ? options.squashOnMerge : this.squash;
    const success = await this.info.merge({
      sha: options.diffHeadSha,
      strategy: mode === 'immediate' ? undefined : mode,
      squash,
      shouldRemoveSourceBranch: options.userPermissions.removeSourceBranch
        ? this.removeSourceBranch
        : undefined,
      commitMessage:
        !options.mergeRequestsFfOnlyEnabled &&
        this.commitMessage !== options.defaultMergeCommitMessage
          ? this.commitMessage.trim()
            ? this.commitMessage
            : undefined
          : undefined,
      squashCommitMessage:
        squash &&
        this.canEditSquashMessage &&
        this.squashMessage !== options.defaultSquashCommitMessage
          ? this.squashMessage.trim()
            ? this.squashMessage
            : undefined
          : undefined,
    });
    if (success) this.complete(scope, 'sent');
  }

  @actionBound
  private complete(scope: string, outcome: 'sent' | 'cancelled') {
    if (scope !== this.scope || scope !== this.currentScope) return;
    this.dialog.current?.close();
    this.outcome = outcome;
  }
}
