import { actionBound, computed, observable, runInAction } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import {
  isPipelineActive,
  pipelineJobAction,
} from '@/entities/gitlab-pipelines';
import type {
  GitLabJobDC,
  GitLabPipelineDC,
  GitLabPipelineSummaryDC,
  GitLabProjectDC,
} from '@/shared/api/gitlab';
import { gitlabApi } from '@/shared/api/gitlab';
import {
  createGitlabApiQuery,
  createGitlabQuery,
} from '@/shared/lib/gitlab/connection/create-query';
import { type MessageKey, t } from '@/shared/lib/i18n';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { VM } from '@/shared/lib/view-models/vm';
import type { Globals } from '@/shared/model/globals';

export interface PipelineCardPayload {
  projectId: number;
  projectPath?: string;
  pipelineId: number;
  summary?: Partial<GitLabPipelineSummaryDC>;
  labelKey?: MessageKey;
  lookupProject?: boolean;
  permissions: GitLabProjectDC['permissions'];
}

export class PipelineCardVM extends VM<PipelineCardPayload> {
  readonly pipelineQuery;
  readonly projectQuery;
  readonly jobsQuery;

  @observable private accessor openPipelineKey: string | null = null;
  @observable accessor busyJobId: number | null = null;
  @observable private accessor actionErrorValue: Error | null = null;

  get actionError() {
    return this.actionErrorValue?.message ?? null;
  }

  constructor(globals: Globals, params: ViewModelParams<PipelineCardPayload>) {
    super(globals, params);

    this.projectQuery = createGitlabQuery<GitLabProjectDC>({
      globals,
      abortSignal: this.unmountSignal,
      params: () =>
        this.payload.lookupProject && {
          path: `/projects/${this.payload.projectId}`,
        },
      queryOptions: { staleTime: 60_000 },
    });

    this.pipelineQuery = createGitlabQuery<GitLabPipelineDC>({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () => ({
        path: `/projects/${this.payload.projectId}/pipelines/${this.payload.pipelineId}`,
      }),
      queryOptions: () => ({
        refetchInterval: (query) => {
          const pipeline = query.state.data as GitLabPipelineDC | undefined;
          return isPipelineActive(pipeline?.status ?? '') ? 5000 : false;
        },
      }),
    });

    this.jobsQuery = createGitlabApiQuery<
      GitLabJobDC[],
      { projectId: number; pipelineId: number }
    >({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () =>
        this.detailsOpen && {
          projectId: this.payload.projectId,
          pipelineId: this.payload.pipelineId,
        },
      queryKey: ({ connection, projectId, pipelineId }) => [
        'pipeline-jobs',
        connection.id,
        connection.credentialsRevision,
        projectId,
        pipelineId,
      ],
      queryFn: ({ connection, projectId, pipelineId, signal }) =>
        gitlabApi.getPipelineJobs(connection, projectId, pipelineId, signal),
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
    return `${this.globals.stores.settings.activeId}/${this.globals.stores.settings.activeItem?.credentialsRevision}/${this.payload.projectId}/${this.payload.pipelineId}`;
  }

  @computed
  get detailsOpen() {
    return this.openPipelineKey === this.pipelineKey;
  }

  @actionBound
  openDetails() {
    this.actionErrorValue = null;
    this.openPipelineKey = this.pipelineKey;
  }

  @actionBound
  closeDetails() {
    this.openPipelineKey = null;
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

  @actionBound
  refreshDetails() {
    void this.jobsQuery.refetch();
    void this.pipelineQuery.refetch();
  }

  @actionBound
  async runJob(job: GitLabJobDC) {
    const connection = this.globals.stores.settings.activeConnection;
    const action = pipelineJobAction(job.status);
    if (!connection || !action || !this.canRunJobs || this.busyJobId !== null) {
      return;
    }

    const pipelineKey = this.pipelineKey;
    this.busyJobId = job.id;
    this.actionErrorValue = null;

    try {
      if (action === 'play') {
        await gitlabApi.playPipelineJob(
          connection,
          this.payload.projectId,
          job.id,
          this.unmountSignal,
        );
      } else if (action === 'cancel') {
        await gitlabApi.cancelPipelineJob(
          connection,
          this.payload.projectId,
          job.id,
          this.unmountSignal,
        );
      } else {
        await gitlabApi.retryPipelineJob(
          connection,
          this.payload.projectId,
          job.id,
          this.unmountSignal,
        );
      }

      if (pipelineKey === this.openPipelineKey) {
        await Promise.all([
          this.jobsQuery.refetch(),
          this.pipelineQuery.refetch(),
        ]);
      }
    } catch (error) {
      runInAction(() => {
        if (pipelineKey !== this.pipelineKey) return;
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
}
