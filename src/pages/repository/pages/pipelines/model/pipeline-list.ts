import {
  actionBound,
  computed,
  observable,
  observableRef,
  runInAction,
} from 'mobx';
import type { Workspace } from '@/features/workspace-navigation';
import type {
  GitLabJobDC,
  GitLabMergeRequestDC,
  GitLabPipelineDC,
  GitLabPipelineVariableDC,
  GitLabProjectDC,
} from '@/shared/api/gitlab';
import { gitlabApi } from '@/shared/api/gitlab';
import {
  createGitlabApiQuery,
  createInfiniteGitlabQuery,
} from '@/shared/lib/gitlab/connection/create-query';
import { t } from '@/shared/lib/i18n';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';

export interface PipelineListParams {
  globals: Workspace;
  abortSignal: AbortSignal;
  projectId: () => number | null;
  project: () => GitLabProjectDC | null;
  defaultBranch: () => string | null;
  canManagePipelines: () => boolean;
}

export type PipelineAction = 'cancel' | 'retry';

const parsePipelineVariables = (input: string): GitLabPipelineVariableDC[] =>
  input
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex < 1) {
        throw new LocalizedError('pipelines.invalidVariable', { v1: line });
      }

      const key = line.slice(0, separatorIndex).trim();
      if (!key) {
        throw new LocalizedError('pipelines.invalidVariableKey', { v1: line });
      }

      return {
        key,
        value: line.slice(separatorIndex + 1),
        variable_type: 'env_var',
      };
    });

const activeStatuses = new Set([
  'created',
  'waiting_for_resource',
  'preparing',
  'waiting_for_callback',
  'pending',
  'running',
  'scheduled',
  'canceling',
]);
export const isPipelineActive = (status: string) => activeStatuses.has(status);
const canCancelStatus = (status: string) =>
  status !== 'canceling' && isPipelineActive(status);

export const getPipelineMergeRequestIid = (
  pipeline: GitLabPipelineDC,
): number | null => {
  const match = pipeline.ref.match(/(?:^|\/)merge-requests\/(\d+)\/head$/);
  return match?.[1] ? Number(match[1]) : null;
};

export class PipelineList {
  readonly pipelinesQuery;
  readonly mergeRequestDetailsQuery;
  @observable accessor statusFilter = '';
  @observable accessor refSearch = '';
  @observable accessor refFilter = '';
  @observableRef accessor openedRun: GitLabPipelineDC | null = null;
  @observable accessor busyPipelineId: number | null = null;
  @observable accessor busyJobId: number | null = null;
  @observable private accessor actionErrorValue: Error | null = null;

  get actionError() {
    return this.actionErrorValue?.message ?? null;
  }
  @observable accessor isCreateFormOpen = false;
  @observable accessor pipelineRef = '';
  @observable accessor variablesText = '';
  @observable accessor isCreatingPipeline = false;
  @observable private accessor createPipelineErrorValue: Error | null = null;

  get createPipelineError() {
    return this.createPipelineErrorValue?.message ?? null;
  }

  constructor(private readonly params: PipelineListParams) {
    this.pipelinesQuery = createInfiniteGitlabQuery<GitLabPipelineDC>({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => {
        const projectId = params.projectId();
        if (projectId === null) {
          return false;
        }

        return {
          path: `/projects/${projectId}/pipelines`,
          query: {
            order_by: 'id',
            sort: 'desc',
            per_page: 20,
            status: this.statusFilter || undefined,
            ref: this.refFilter || undefined,
          },
        };
      },
      queryOptions: () => {
        const opened = this.openedRun;
        if (!opened) return { refetchInterval: false };
        return {
          refetchInterval: () =>
            isPipelineActive(this.selectedPipeline?.status ?? opened.status)
              ? 5000
              : false,
        };
      },
    });

    this.mergeRequestDetailsQuery = createGitlabApiQuery<
      Record<number, GitLabMergeRequestDC | null>,
      { projectId: number; iids: number[] }
    >({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => {
        const projectId = params.projectId();
        const iids = this.mergeRequestIids;
        return projectId === null || iids.length === 0
          ? false
          : { projectId, iids };
      },
      queryKey: ({ connection, projectId, iids }) =>
        [
          'pipeline-merge-request-details',
          connection.id,
          connection.gitlabUrl,
          connection.credentialsRevision,
          projectId,
          iids,
        ] as const,
      queryFn: async ({ connection, projectId, iids, signal }) => {
        const results = await Promise.all(
          iids.map(async (iid) => {
            try {
              const mergeRequest = await gitlabApi.fetch<GitLabMergeRequestDC>(
                connection,
                `/projects/${projectId}/merge_requests/${iid}`,
                { signal },
              );
              return [iid, mergeRequest] as const;
            } catch {
              return [iid, null] as const;
            }
          }),
        );

        return Object.fromEntries(results);
      },
    });
  }

  @computed
  get pipelines(): GitLabPipelineDC[] {
    return (this.pipelinesQuery.data?.pages ?? []).flatMap(
      (page) => page.items,
    );
  }

  @computed
  get selectedPipeline() {
    const opened = this.openedRun;
    return (
      opened && (this.pipelines.find((run) => run.id === opened.id) ?? opened)
    );
  }

  @computed
  get mergeRequestIids(): number[] {
    return [
      ...new Set(
        this.pipelines
          .map(getPipelineMergeRequestIid)
          .filter((iid): iid is number => iid !== null),
      ),
    ];
  }

  @computed
  get mergeRequestDetails(): Record<number, GitLabMergeRequestDC | null> {
    return this.mergeRequestDetailsQuery.data ?? {};
  }

  @computed
  get isLoading() {
    return this.pipelinesQuery.isLoading;
  }

  @computed
  get isFetchingNextPage() {
    return this.pipelinesQuery.isFetchingNextPage;
  }

  @computed
  get canLoadMore() {
    return (
      this.pipelinesQuery.hasNextPage &&
      !this.isLoading &&
      !this.pipelinesQuery.isFetching &&
      !this.isFetchingNextPage
    );
  }

  @computed
  get errorMessage() {
    const error = this.pipelinesQuery.error;
    return error instanceof Error
      ? error.message
      : error
        ? t('pipelines.couldNotLoadPipelines')
        : null;
  }

  @computed
  get showLoadError() {
    return Boolean(this.errorMessage) && !this.isLoading;
  }

  @computed
  get showEmptyListMessage() {
    return !this.isLoading && !this.errorMessage && this.pipelines.length === 0;
  }

  @computed
  get canManagePipelines() {
    return this.params.canManagePipelines();
  }

  @computed
  get canLoadMoreLabel() {
    const loadedCount = this.pipelines.length;
    const total = this.pipelinesQuery.data?.pages[0]?.total;
    return total === null || total === undefined
      ? t('pipelines.loadMore', { v1: loadedCount })
      : t('pipelines.loadMoreOf', { v1: loadedCount, v2: total });
  }

  mergeRequestForPipeline(pipeline: GitLabPipelineDC) {
    const iid = getPipelineMergeRequestIid(pipeline);
    return iid === null ? null : (this.mergeRequestDetails[iid] ?? null);
  }

  isPipelineCancelable(pipeline: GitLabPipelineDC) {
    return this.params.canManagePipelines() && canCancelStatus(pipeline.status);
  }

  isPipelineRetryable(pipeline: GitLabPipelineDC) {
    return (
      this.params.canManagePipelines() &&
      (pipeline.status === 'failed' || pipeline.status === 'canceled')
    );
  }

  isJobCancelable(job: GitLabJobDC) {
    return this.params.canManagePipelines() && canCancelStatus(job.status);
  }

  canRunJob(job: GitLabJobDC) {
    return (
      this.params.canManagePipelines() &&
      (job.status === 'manual' ||
        job.status === 'failed' ||
        job.status === 'canceled')
    );
  }

  @actionBound
  setStatusFilter(status: string) {
    this.statusFilter = status;
  }

  @actionBound
  setRefSearch(ref: string) {
    this.refSearch = ref;
  }

  @actionBound
  applyRefFilter() {
    this.refFilter = this.refSearch.trim();
  }

  @actionBound
  loadMore() {
    if (this.canLoadMore) {
      void this.pipelinesQuery.fetchNextPage();
    }
  }

  @actionBound
  refresh() {
    void this.pipelinesQuery.refetch();
  }

  @actionBound
  selectPipeline(pipeline: GitLabPipelineDC | null) {
    this.openedRun = pipeline;
    this.actionErrorValue = null;
  }

  @actionBound
  openMergeRequest(iid: number) {
    const projectId = this.params.projectId();
    const project = this.params.project();
    const connectionId = this.params.globals.stores.settings.activeId;
    if (projectId === null || !project || !connectionId) {
      return;
    }

    this.params.globals.navigation.mergeRequests.open(
      connectionId,
      project,
      iid,
      this.mergeRequestDetails[iid]?.title ?? 'Merge Request',
    );
  }

  @actionBound
  async runPipelineAction(
    pipeline: GitLabPipelineDC,
    actionType: PipelineAction,
  ) {
    const projectId = this.params.projectId();
    const connection = this.params.globals.stores.settings.activeConnection;
    if (
      projectId === null ||
      !connection ||
      !this.params.canManagePipelines() ||
      this.busyPipelineId !== null ||
      this.busyJobId !== null
    ) {
      return;
    }

    this.busyPipelineId = pipeline.id;
    this.actionErrorValue = null;

    try {
      if (actionType === 'cancel') {
        await gitlabApi.cancelPipeline(
          connection,
          projectId,
          pipeline.id,
          this.params.abortSignal,
        );
      } else {
        await gitlabApi.retryPipeline(
          connection,
          projectId,
          pipeline.id,
          this.params.abortSignal,
        );
      }

      await this.pipelinesQuery.refetch();
    } catch (error) {
      runInAction(() => {
        this.actionErrorValue =
          error instanceof Error
            ? error
            : new LocalizedError('common.couldNotCompleteTheAction');
      });
    } finally {
      runInAction(() => {
        this.busyPipelineId = null;
      });
    }
  }

  @actionBound
  async runJobAction(job: GitLabJobDC) {
    const projectId = this.params.projectId();
    const connection = this.params.globals.stores.settings.activeConnection;
    if (
      projectId === null ||
      !connection ||
      !this.params.canManagePipelines() ||
      this.busyJobId !== null ||
      this.busyPipelineId !== null
    ) {
      return;
    }

    this.busyJobId = job.id;
    this.actionErrorValue = null;

    try {
      if (!this.canRunJob(job) && !this.isJobCancelable(job)) {
        return;
      }

      if (job.status === 'manual') {
        await gitlabApi.playPipelineJob(
          connection,
          projectId,
          job.id,
          this.params.abortSignal,
        );
      } else if (job.status === 'failed' || job.status === 'canceled') {
        await gitlabApi.retryPipelineJob(
          connection,
          projectId,
          job.id,
          this.params.abortSignal,
        );
      } else if (this.isJobCancelable(job)) {
        await gitlabApi.cancelPipelineJob(
          connection,
          projectId,
          job.id,
          this.params.abortSignal,
        );
      } else {
        return;
      }

      await this.pipelinesQuery.refetch();
    } catch (error) {
      runInAction(() => {
        this.actionErrorValue =
          error instanceof Error
            ? error
            : new LocalizedError('common.couldNotCompleteTheAction');
      });
    } finally {
      runInAction(() => {
        this.busyJobId = null;
      });
    }
  }

  @actionBound
  toggleCreateForm() {
    this.isCreateFormOpen = !this.isCreateFormOpen;
    this.createPipelineErrorValue = null;
    if (this.isCreateFormOpen && !this.pipelineRef.trim()) {
      this.pipelineRef = this.params.defaultBranch() ?? '';
    }
  }

  @actionBound
  setPipelineRef(ref: string) {
    this.pipelineRef = ref;
  }

  @actionBound
  setVariablesText(value: string) {
    this.variablesText = value;
  }

  @actionBound
  async createPipeline() {
    const projectId = this.params.projectId();
    const connection = this.params.globals.stores.settings.activeConnection;
    const ref = this.pipelineRef.trim();
    if (this.isCreatingPipeline) {
      return;
    }

    if (projectId === null || !connection) {
      this.createPipelineErrorValue = new LocalizedError(
        'pipelines.noActiveGitlabConnection',
      );
      return;
    }

    if (!this.params.canManagePipelines()) {
      this.createPipelineErrorValue = new LocalizedError(
        'pipelines.runningAPipelineRequiresTheDeveloperRole',
      );
      return;
    }

    if (!ref) {
      this.createPipelineErrorValue = new LocalizedError(
        'pipelines.enterABranchTagOrCommitSha',
      );
      return;
    }

    let variables: GitLabPipelineVariableDC[];
    try {
      variables = parsePipelineVariables(this.variablesText);
    } catch (error) {
      this.createPipelineErrorValue =
        error instanceof Error
          ? error
          : new LocalizedError('pipelines.checkTheVariableFormat');
      return;
    }

    this.isCreatingPipeline = true;
    this.createPipelineErrorValue = null;

    try {
      await gitlabApi.createPipeline(
        connection,
        projectId,
        ref,
        variables,
        this.params.abortSignal,
      );
      runInAction(() => {
        this.isCreateFormOpen = false;
        this.variablesText = '';
        this.statusFilter = '';
        this.refSearch = '';
        this.refFilter = '';
      });
      await this.pipelinesQuery.refetch();
    } catch (error) {
      runInAction(() => {
        this.createPipelineErrorValue =
          error instanceof Error
            ? error
            : new LocalizedError('pipelines.couldNotRunThePipeline');
      });
    } finally {
      runInAction(() => {
        this.isCreatingPipeline = false;
      });
    }
  }
}
