import { action, computed, observable, runInAction } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { gitlabApi } from "@/shared/api/gitlab";
import type {
  GitLabJobDC,
  GitLabPipelineDC,
  GitLabProjectDC,
} from "@/shared/api/gitlab";
import { createGitlabQuery } from "@/shared/lib/gitlab/create-query";
import { VM } from "@/shared/lib/view-models/vm";

export interface PipelineCardPayload {
  projectId: number;
  pipelineId: number;
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
  readonly projectQuery;
  readonly jobsQuery;

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

    this.projectQuery = createGitlabQuery<GitLabProjectDC>({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () => ({ path: `/projects/${this.payload.projectId}` }),
    });

    this.jobsQuery = createGitlabQuery<GitLabJobDC[]>({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () => ({
        path: `/projects/${this.payload.projectId}/pipelines/${this.payload.pipelineId}/jobs`,
        query: {
          per_page: 100,
          include_retried: false,
        },
      }),
      queryOptions: () => ({
        refetchInterval: (query) => {
          const jobs = query.state.data as GitLabJobDC[] | undefined;
          const hasActiveJob =
            jobs?.some((job) => ACTIVE_JOB_STATUSES.has(job.status)) ?? false;

          return this.shouldPollPipeline || hasActiveJob ? 5000 : false;
        },
      }),
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

  @computed
  get stages(): Array<{ name: string; jobs: GitLabJobDC[] }> {
    const stageMap = new Map<string, GitLabJobDC[]>();

    for (const job of [...this.jobs].reverse()) {
      const stageJobs = stageMap.get(job.stage) ?? [];
      stageJobs.push(job);
      stageMap.set(job.stage, stageJobs);
    }

    return [...stageMap].map(([name, jobs]) => ({ name, jobs }));
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
    const permissions = this.projectQuery.data?.permissions;
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

  @action.bound
  async runJob(job: GitLabJobDC) {
    const connection = this.globals.stores.settings.activeConnection;
    if (!connection || !this.canRun(job) || this.busyJobId !== null) {
      return;
    }

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

      await this.jobsQuery.refetch();
    } catch (error) {
      runInAction(() => {
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
