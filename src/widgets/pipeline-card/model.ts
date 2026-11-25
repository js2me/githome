import { actionBound, computed, observable, runInAction } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { gitlabApi } from "@/shared/api/gitlab";
import type {
  GitLabJobDC,
  GitLabPipelineDC,
  GitLabProjectDC,
} from "@/shared/api/gitlab";
import { createGitlabApiQuery, createGitlabQuery } from "@/shared/lib/gitlab/create-query";
import { VM } from "@/shared/lib/view-models/vm";

export interface PipelineCardPayload {
  projectId: number;
  pipelineId: number;
  permissions: GitLabProjectDC["permissions"];
}

const ACTIVE_JOB_STATUSES = new Set(["created", "pending", "running"]);
const ACTIVE_PIPELINE_STATUSES = new Set([
  "created",
  "waiting_for_resource",
  "preparing",
  "pending",
  "running",
]);

export class PipelineCardVM extends VM<PipelineCardPayload> {
  readonly pipelineQuery;
  readonly jobsQuery;

  @observable private accessor openPipelineKey: string | null = null;
  @observable accessor busyJobId: number | null = null;
  @observable accessor actionError: string | null = null;

  constructor(globals: Globals, params: ViewModelParams<PipelineCardPayload>) {
    super(globals, params);

    this.pipelineQuery = createGitlabQuery<GitLabPipelineDC>({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () => ({
        path: `/projects/${this.payload.projectId}/pipelines/${this.payload.pipelineId}`,
      }),
      queryOptions: () => ({
        refetchInterval: (query) => {
          const pipeline = query.state.data as GitLabPipelineDC | undefined;
          return ACTIVE_PIPELINE_STATUSES.has(pipeline?.status ?? "")
            ? 5000
            : false;
        },
      }),
    });

    this.jobsQuery = createGitlabApiQuery<GitLabJobDC[], { projectId: number; pipelineId: number }>({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () => this.detailsOpen && ({
        projectId: this.payload.projectId,
        pipelineId: this.payload.pipelineId,
      }),
      queryKey: ({ connection, projectId, pipelineId }) =>
        ["pipeline-jobs", connection.id, connection.credentialsRevision, projectId, pipelineId],
      queryFn: ({ connection, projectId, pipelineId, signal }) =>
        gitlabApi.getPipelineJobs(connection, projectId, pipelineId, signal),
      queryOptions: {
        refetchInterval: ({ state }) => {
          const jobs = state.data as GitLabJobDC[] | undefined;
          const hasActiveJob =
            jobs?.some((job) => ACTIVE_JOB_STATUSES.has(job.status)) ?? false;

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
  get pipeline(): GitLabPipelineDC | undefined {
    return this.pipelineQuery.data;
  }

  private get pipelineKey() {
    return `${this.globals.stores.settings.activeId}/${this.payload.projectId}/${this.payload.pipelineId}`;
  }

  @computed
  get detailsOpen() {
    return this.openPipelineKey === this.pipelineKey;
  }

  @actionBound
  openDetails() {
    this.actionError = null;
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
        ? "Не удалось загрузить jobs"
        : null;
  }

  @computed
  get pipelineErrorMessage() {
    const error = this.pipelineQuery.error;
    return error instanceof Error
      ? error.message
      : error
        ? "Не удалось загрузить pipeline"
        : null;
  }

  @computed
  get canRunJobs() {
    const permissions = this.payload.permissions;
    return Math.max(
      permissions?.project_access?.access_level ?? 0,
      permissions?.group_access?.access_level ?? 0,
    ) >= 30;
  }

  @computed
  get shouldPollPipeline() {
    return ACTIVE_PIPELINE_STATUSES.has(this.pipeline?.status ?? "");
  }

  canRun(job: GitLabJobDC) {
    return (
      this.canRunJobs &&
      (job.status === "manual" ||
        job.status === "failed" ||
        job.status === "canceled")
    );
  }

  @actionBound
  async runJob(job: GitLabJobDC) {
    const connection = this.globals.stores.settings.activeConnection;
    if (!connection || !this.canRun(job) || this.busyJobId !== null) {
      return;
    }

    const pipelineKey = this.pipelineKey;
    this.busyJobId = job.id;
    this.actionError = null;

    try {
      if (job.status === "manual") {
        await gitlabApi.playPipelineJob(
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

      if (pipelineKey === this.openPipelineKey) await this.jobsQuery.refetch();
    } catch (error) {
      runInAction(() => {
        if (pipelineKey !== this.pipelineKey) return;
        this.actionError =
          error instanceof Error ? error.message : "Не удалось выполнить действие";
      });
    } finally {
      runInAction(() => {
        this.busyJobId = null;
      });
    }
  }
}
