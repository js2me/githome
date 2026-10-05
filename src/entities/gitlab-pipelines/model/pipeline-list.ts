import { action, computed, observable, runInAction } from "mobx";
import type { Globals } from "@/globals";
import { gitlabApi } from "@/shared/api/gitlab";
import type {
  GitLabJobDC,
  GitLabMergeRequestDC,
  GitLabPipelineDC,
  GitLabPipelineVariableDC,
} from "@/shared/api/gitlab";
import {
  createGitlabApiQuery,
  createInfiniteGitlabQuery,
} from "@/shared/lib/gitlab/create-query";

export interface PipelineListParams {
  globals: Globals;
  abortSignal: AbortSignal;
  projectId: () => number | null;
  defaultBranch: () => string | null;
  canManagePipelines: () => boolean;
}

export type PipelineAction = "cancel" | "retry";

const parsePipelineVariables = (input: string): GitLabPipelineVariableDC[] =>
  input
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex < 1) {
        throw new Error(`Некорректная переменная: ${line}`);
      }

      const key = line.slice(0, separatorIndex).trim();
      if (!key) {
        throw new Error(`Некорректный ключ переменной: ${line}`);
      }

      return {
        key,
        value: line.slice(separatorIndex + 1),
        variable_type: "env_var",
      };
    });

const isPipelineActive = (status: string) =>
  [
    "created",
    "waiting_for_resource",
    "preparing",
    "waiting_for_callback",
    "pending",
    "running",
    "scheduled",
  ].includes(status);

export const getPipelineMergeRequestIid = (
  pipeline: GitLabPipelineDC,
): number | null => {
  const match = pipeline.ref.match(/(?:^|\/)merge-requests\/(\d+)\/head$/);
  return match?.[1] ? Number(match[1]) : null;
};

export class PipelineList {
  readonly pipelinesQuery;
  readonly mergeRequestDetailsQuery;
  @observable accessor statusFilter = "";
  @observable accessor refSearch = "";
  @observable accessor refFilter = "";
  @observable accessor selectedPipelineId: number | null = null;
  @observable accessor busyPipelineId: number | null = null;
  @observable accessor busyJobId: number | null = null;
  @observable accessor actionError: string | null = null;
  @observable accessor isCreateFormOpen = false;
  @observable accessor pipelineRef = "";
  @observable accessor variablesText = "";
  @observable accessor isCreatingPipeline = false;
  @observable accessor createPipelineError: string | null = null;

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
            order_by: "id",
            sort: "desc",
            per_page: 20,
            status: this.statusFilter || undefined,
            ref: this.refFilter || undefined,
          },
        };
      },
      queryOptions: () => ({
        refetchInterval: this.selectedPipelineId === null ? false : 5000,
      }),
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
        ["pipeline-merge-request-details", connection.gitlabUrl, projectId, iids] as const,
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
    return (this.pipelinesQuery.data?.pages ?? []).flatMap((page) => page.items);
  }

  @computed
  get mergeRequestIids(): number[] {
    return [...new Set(this.pipelines
      .map(getPipelineMergeRequestIid)
      .filter((iid): iid is number => iid !== null))];
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
        ? "Не удалось загрузить pipelines"
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
      ? `Загрузить ещё (${loadedCount})`
      : `Загрузить ещё (${loadedCount} из ${total})`;
  }

  mergeRequestForPipeline(pipeline: GitLabPipelineDC) {
    const iid = getPipelineMergeRequestIid(pipeline);
    return iid === null ? null : this.mergeRequestDetails[iid] ?? null;
  }

  isPipelineCancelable(pipeline: GitLabPipelineDC) {
    return this.params.canManagePipelines() && isPipelineActive(pipeline.status);
  }

  isPipelineRetryable(pipeline: GitLabPipelineDC) {
    return (
      this.params.canManagePipelines() &&
      (pipeline.status === "failed" || pipeline.status === "canceled")
    );
  }

  isJobCancelable(job: GitLabJobDC) {
    return (
      this.params.canManagePipelines() &&
      [
        "created",
        "waiting_for_resource",
        "preparing",
        "waiting_for_callback",
        "pending",
        "running",
        "scheduled",
      ].includes(job.status)
    );
  }

  canRunJob(job: GitLabJobDC) {
    return (
      this.params.canManagePipelines() &&
      (job.status === "manual" ||
        job.status === "failed" ||
        job.status === "canceled")
    );
  }

  @action.bound
  setStatusFilter(status: string) {
    this.statusFilter = status;
  }

  @action.bound
  setRefSearch(ref: string) {
    this.refSearch = ref;
  }

  @action.bound
  applyRefFilter() {
    this.refFilter = this.refSearch.trim();
  }

  @action.bound
  loadMore() {
    if (this.canLoadMore) {
      void this.pipelinesQuery.fetchNextPage();
    }
  }

  @action.bound
  refresh() {
    void this.pipelinesQuery.refetch();
  }

  @action.bound
  togglePipeline(pipeline: GitLabPipelineDC) {
    const isSamePipeline = this.selectedPipelineId === pipeline.id;
    this.selectedPipelineId = isSamePipeline ? null : pipeline.id;
    this.actionError = null;
  }

  @action.bound
  openMergeRequest(iid: number) {
    const projectId = this.params.projectId();
    if (projectId === null) {
      return;
    }

    void this.params.globals.routes.mergeRequest.open({
      projectId: String(projectId),
      mergeRequestIid: String(iid),
    });
  }

  @action.bound
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
    this.actionError = null;

    try {
      if (actionType === "cancel") {
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
        this.actionError = error instanceof Error ? error.message : "Не удалось выполнить действие";
      });
    } finally {
      runInAction(() => {
        this.busyPipelineId = null;
      });
    }
  }

  @action.bound
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
    this.actionError = null;

    try {
      if (!this.canRunJob(job) && !this.isJobCancelable(job)) {
        return;
      }

      if (job.status === "manual") {
        await gitlabApi.playPipelineJob(
          connection,
          projectId,
          job.id,
          this.params.abortSignal,
        );
      } else if (job.status === "failed" || job.status === "canceled") {
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
        this.actionError = error instanceof Error ? error.message : "Не удалось выполнить действие";
      });
    } finally {
      runInAction(() => {
        this.busyJobId = null;
      });
    }
  }

  @action.bound
  toggleCreateForm() {
    this.isCreateFormOpen = !this.isCreateFormOpen;
    this.createPipelineError = null;
    if (this.isCreateFormOpen && !this.pipelineRef.trim()) {
      this.pipelineRef = this.params.defaultBranch() ?? "";
    }
  }

  @action.bound
  setPipelineRef(ref: string) {
    this.pipelineRef = ref;
  }

  @action.bound
  setVariablesText(value: string) {
    this.variablesText = value;
  }

  @action.bound
  async createPipeline() {
    const projectId = this.params.projectId();
    const connection = this.params.globals.stores.settings.activeConnection;
    const ref = this.pipelineRef.trim();
    if (this.isCreatingPipeline) {
      return;
    }

    if (projectId === null || !connection) {
      this.createPipelineError = "Нет активного подключения к GitLab.";
      return;
    }

    if (!this.params.canManagePipelines()) {
      this.createPipelineError =
        "Для запуска pipeline нужны права Developer или выше.";
      return;
    }

    if (!ref) {
      this.createPipelineError = "Укажите ветку, тег или commit SHA.";
      return;
    }

    let variables: GitLabPipelineVariableDC[];
    try {
      variables = parsePipelineVariables(this.variablesText);
    } catch (error) {
      this.createPipelineError =
        error instanceof Error ? error.message : "Проверьте формат variables";
      return;
    }

    this.isCreatingPipeline = true;
    this.createPipelineError = null;

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
        this.variablesText = "";
        this.statusFilter = "";
        this.refSearch = "";
        this.refFilter = "";
      });
      await this.pipelinesQuery.refetch();
    } catch (error) {
      runInAction(() => {
        this.createPipelineError =
          error instanceof Error ? error.message : "Не удалось запустить pipeline";
      });
    } finally {
      runInAction(() => {
        this.isCreatingPipeline = false;
      });
    }
  }
}
