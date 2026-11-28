import { actionBound, computed, observable, runInAction } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import type { ReactNode } from 'react';
import {
  isPipelineActive,
  PipelineJobRunner,
} from '@/entities/gitlab-pipelines';
import type {
  GitLabJobDC,
  GitLabPipelineDC,
  GitLabPipelineSummaryDC,
  GitLabProjectDC,
} from '@/shared/api/gitlab';
import { gitlabApi } from '@/shared/api/gitlab';
import {
  createPipelineJobsQuery,
  createPipelineQuery,
} from '@/shared/api/gitlab/queries/pipelines';
import { createProjectQuery } from '@/shared/api/gitlab/queries/projects';
import { type MessageKey, t } from '@/shared/lib/i18n';
import { VM } from '@/shared/lib/view-models/vm';
import type { Globals } from '@/shared/model/globals';

interface PipelineRunPayload {
  projectId: number;
  projectPath?: string;
  pipelineId: number;
  summary?: Partial<GitLabPipelineSummaryDC>;
  labelKey?: MessageKey;
  lookupProject?: boolean;
  permissions: GitLabProjectDC['permissions'];
  history: ReactNode;
  historyRefreshing: boolean;
  heading: string;
  onRefreshHistory: () => void;
  onClose: () => void;
}

export class PipelineRunVM extends VM<PipelineRunPayload> {
  readonly pipelineQuery;
  readonly projectQuery;
  readonly jobsQuery;

  readonly jobRunner = new PipelineJobRunner();
  @observable accessor busyPipeline: string | null = null;
  @observable private accessor pipelineActionFailure: {
    key: string;
    error: unknown;
  } | null = null;

  get actionError() {
    const failure = this.pipelineActionFailure;
    const message =
      failure?.key === this.pipelineKey
        ? failure.error instanceof Error
          ? failure.error.message
          : t('common.couldNotCompleteTheAction')
        : null;
    return [message, this.jobRunner.errorMessage(this.pipelineKey)]
      .filter(Boolean)
      .join('\n');
  }

  pendingJobAction = (id: number) =>
    this.jobRunner.pendingAction(this.pipelineKey, id);

  constructor(globals: Globals, params: ViewModelParams<PipelineRunPayload>) {
    super(globals, params);

    this.projectQuery = createProjectQuery({
      globals,
      abortSignal: this.unmountSignal,
      params: () =>
        this.payload.lookupProject && {
          projectId: this.payload.projectId,
        },
      queryOptions: { staleTime: 60_000 },
    });

    this.pipelineQuery = createPipelineQuery({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () => ({
        projectId: this.payload.projectId,
        pipelineId: this.payload.pipelineId,
      }),
      queryOptions: () => ({
        refetchInterval: (query) => {
          const pipeline = query.state.data as GitLabPipelineDC | undefined;
          return isPipelineActive(pipeline?.status ?? '') ? 5000 : false;
        },
      }),
    });

    this.jobsQuery = createPipelineJobsQuery({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () => ({
        projectId: this.payload.projectId,
        pipelineId: this.payload.pipelineId,
      }),
      queryOptions: {
        refetchInterval: ({ state }) => {
          const jobs = state.data as GitLabJobDC[] | undefined;
          const hasActiveJob =
            jobs?.some((job) => isPipelineActive(job.status)) ?? false;

          return this.shouldPollPipeline || hasActiveJob ? 5000 : false;
        },
      },
    });
  }

  @computed
  get jobs(): GitLabJobDC[] {
    return this.jobsQuery.data ?? [];
  }

  @computed
  get pipeline() {
    return this.pipelineQuery.data ?? this.payload.summary;
  }

  @computed
  get projectPath() {
    return (
      this.payload.projectPath || this.projectQuery.data?.path_with_namespace
    );
  }

  private get pipelineKey() {
    return `${this.globals.stores.settings.activeId}/${this.globals.stores.settings.activeConnection?.credentialsRevision}/${this.payload.projectId}/${this.payload.pipelineId}`;
  }

  @computed
  get isLoading() {
    return this.jobsQuery.isLoading;
  }

  @computed
  get errorMessage() {
    const error = this.jobsQuery.error;
    return error instanceof Error
      ? error.message
      : error
        ? t('pipelines.couldNotLoadJobs2')
        : null;
  }

  @computed
  get pipelineErrorMessage() {
    const error = this.pipelineQuery.error;
    return error instanceof Error
      ? error.message
      : error
        ? t('pipelines.couldNotLoadThePipeline')
        : null;
  }

  @computed
  get canRunJobs() {
    const permissions =
      this.payload.permissions ?? this.projectQuery.data?.permissions;
    return (
      Math.max(
        permissions?.project_access?.access_level ?? 0,
        permissions?.group_access?.access_level ?? 0,
      ) >= 30
    );
  }

  @computed
  get shouldPollPipeline() {
    return isPipelineActive(this.pipeline?.status ?? '');
  }

  @computed
  get pipelineAction() {
    const status = this.pipelineQuery.data?.status;
    if (!this.canRunJobs || !status) return null;
    if (status !== 'canceling' && isPipelineActive(status)) return 'cancel';
    return status === 'failed' || status === 'canceled' ? 'retry' : null;
  }

  @actionBound
  async runPipelineAction() {
    const action = this.pipelineAction;
    const connection = this.globals.stores.settings.activeConnection;
    if (
      !connection ||
      !action ||
      this.busyPipeline ||
      this.jobRunner.hasPending
    )
      return;
    const { projectId, pipelineId } = this.payload;
    const key = this.pipelineKey;
    const signal = this.unmountSignal;
    this.busyPipeline = key;
    this.pipelineActionFailure = null;
    try {
      const send =
        action === 'cancel'
          ? gitlabApi.cancelPipeline
          : gitlabApi.retryPipeline;
      await send(connection, projectId, pipelineId, signal);
      if (signal.aborted) return;
      this.payload.onRefreshHistory();
      if (this.pipelineKey === key) {
        await Promise.all([
          this.pipelineQuery.refetch(),
          this.jobsQuery.refetch(),
        ]);
      }
    } catch (error) {
      if (!signal.aborted)
        runInAction(() => {
          this.pipelineActionFailure = { key, error };
        });
    } finally {
      runInAction(() => {
        this.busyPipeline = null;
      });
    }
  }

  @actionBound
  refreshDetails() {
    this.payload.onRefreshHistory();
    void this.jobsQuery.refetch();
    void this.pipelineQuery.refetch();
  }

  @actionBound
  async runJobs(jobs: readonly GitLabJobDC[]) {
    const connection = this.globals.stores.settings.activeConnection;
    if (!connection || !this.canRunJobs || this.busyPipeline) return;
    const scope = this.pipelineKey;
    await this.jobRunner.run(jobs, {
      scope,
      connection,
      projectId: this.payload.projectId,
      signal: this.unmountSignal,
      refresh: async () => {
        if (scope !== this.pipelineKey) return;
        this.payload.onRefreshHistory();
        await Promise.all([
          this.pipelineQuery.refetch(),
          this.jobsQuery.refetch(),
        ]);
      },
    });
  }
}
