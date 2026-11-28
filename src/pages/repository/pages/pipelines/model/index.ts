import { actionBound, computed, reaction } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import { isPipelineActive } from '@/entities/gitlab-pipelines';
import type { Workspace } from '@/features/workspace-navigation';
import { WorkspaceVM } from '@/features/workspace-navigation';
import type { GitLabJobDC, GitLabPipelineDC } from '@/shared/api/gitlab';
import {
  createPipelineJobsQuery,
  createPipelineQuery,
} from '@/shared/api/gitlab/queries/pipelines';
import type { RepositoryPageVM } from '../../../model/page-vm';
import { PipelineList } from './pipeline-list';

export class PipelinesPageVM extends WorkspaceVM<{}, RepositoryPageVM> {
  readonly pipelineList: PipelineList;
  readonly jobs;
  readonly linkedPipelineQuery;

  constructor(
    globals: Workspace,
    params: ViewModelParams<{}, RepositoryPageVM>,
  ) {
    super(globals, params);

    this.pipelineList = new PipelineList({
      globals,
      abortSignal: this.unmountSignal,
      projectId: () => this.parentViewModel.projectId,
      project: () => this.parentViewModel.project,
      defaultBranch: () =>
        this.parentViewModel.project?.default_branch?.trim() ?? null,
      canManagePipelines: () => {
        const permissions = this.parentViewModel.project?.permissions;
        const accessLevel = Math.max(
          permissions?.project_access?.access_level ?? 0,
          permissions?.group_access?.access_level ?? 0,
        );
        return accessLevel >= 30;
      },
    });

    this.linkedPipelineQuery = createPipelineQuery({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const { projectId } = this.parentViewModel;
        const pipelineId = this.linkedPipelineId;
        return (
          projectId !== null &&
          pipelineId !== null && {
            projectId: projectId,
            pipelineId: pipelineId,
          }
        );
      },
      queryOptions: {
        refetchInterval: ({ state }) => {
          const run = state.data as GitLabPipelineDC | undefined;
          return run && isPipelineActive(run.status) ? 5000 : false;
        },
      },
    });

    this.jobs = createPipelineJobsQuery({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const { projectId } = this.parentViewModel;
        const pipelineId = this.linkedPipelineId ?? this.selectedPipeline?.id;
        return (
          projectId !== null &&
          pipelineId !== undefined && { projectId, pipelineId }
        );
      },
      queryOptions: {
        refetchInterval: ({ state }) => {
          const run = this.selectedPipeline;
          const jobs = state.data as GitLabJobDC[] | undefined;
          return run &&
            (isPipelineActive(run.status) ||
              jobs?.some((job) => isPipelineActive(job.status)))
            ? 5000
            : false;
        },
      },
    });
    reaction(
      () => [
        this.parentViewModel.projectId,
        globals.stores.settings.activeId,
        globals.stores.settings.activeConnection?.credentialsRevision,
      ],
      () => this.pipelineList.selectPipeline(null),
      { signal: this.unmountSignal },
    );
  }

  @computed
  private get linkedPipelineId() {
    const param = this.globals.query.data.pipeline;
    if (
      !this.globals.routes.pipelines.isOpened ||
      !/^[1-9][0-9]*$/.test(param ?? '')
    )
      return null;
    const id = Number(param);
    return Number.isSafeInteger(id) ? id : null;
  }

  @computed
  get selectedPipeline() {
    if (this.linkedPipelineId !== null) {
      return (
        this.linkedPipelineQuery.data ??
        this.pipelineList.pipelines.find(
          (run) => run.id === this.linkedPipelineId,
        ) ??
        null
      );
    }
    return this.pipelineList.selectedPipeline;
  }

  get projectPath() {
    return this.parentViewModel.project?.path_with_namespace;
  }

  @actionBound
  refreshDetails() {
    this.pipelineList.refresh();
    if (this.linkedPipelineId !== null) void this.linkedPipelineQuery.refetch();
    void this.jobs.refetch();
  }

  @actionBound
  openDetails(run: GitLabPipelineDC) {
    if (this.linkedPipelineId !== null) this.closeDetails();
    this.pipelineList.selectPipeline(run);
  }

  @actionBound
  closeDetails() {
    this.pipelineList.selectPipeline(null);
    if (this.linkedPipelineId !== null) {
      this.globals.query.update({ pipeline: null }, { replace: true });
    }
  }

  private jobScope(run: GitLabPipelineDC) {
    const connection = this.globals.stores.settings.activeConnection;
    return `${connection?.id}/${connection?.credentialsRevision}/${run.project_id}/${run.id}`;
  }

  pendingJobAction = (id: number) => {
    const run = this.selectedPipeline;
    return run
      ? this.pipelineList.jobRunner.pendingAction(this.jobScope(run), id)
      : undefined;
  };

  get jobActionError() {
    const run = this.selectedPipeline;
    return run && this.pipelineList.jobRunner.errorMessage(this.jobScope(run));
  }

  @actionBound
  async runJobs(jobs: readonly GitLabJobDC[]) {
    const run = this.selectedPipeline;
    const connection = this.globals.stores.settings.activeConnection;
    if (
      !run ||
      !connection ||
      !this.pipelineList.canManageJobs ||
      this.pipelineList.busyPipelineId === run.id
    )
      return;

    const scope = this.jobScope(run);
    await this.pipelineList.jobRunner.run(jobs, {
      scope,
      connection,
      projectId: run.project_id,
      signal: this.unmountSignal,
      refresh: async () => {
        if (
          this.parentViewModel.projectId !== run.project_id ||
          scope !== this.jobScope(run)
        )
          return;
        const selected = this.selectedPipeline?.id === run.id;
        await Promise.all([
          this.pipelineList.pipelinesQuery.refetch(),
          selected && this.jobs.refetch(),
          selected &&
            this.linkedPipelineId === run.id &&
            this.linkedPipelineQuery.refetch(),
        ]);
      },
    });
  }

  @actionBound
  async runPipeline(run: GitLabPipelineDC, action: 'retry' | 'cancel') {
    await this.pipelineList.runPipelineAction(run, action);
    if (this.selectedPipeline?.id !== run.id) return;
    if (this.linkedPipelineId === run.id)
      void this.linkedPipelineQuery.refetch();
    await this.jobs.refetch();
  }
}
