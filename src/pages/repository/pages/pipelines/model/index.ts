import { actionBound, computed, reaction } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import { isPipelineActive } from '@/entities/gitlab-pipelines';
import type { Workspace } from '@/features/workspace-navigation';
import { WorkspaceVM } from '@/features/workspace-navigation';
import {
  type GitLabJobDC,
  type GitLabPipelineDC,
  gitlabApi,
} from '@/shared/api/gitlab';
import {
  createGitlabApiQuery,
  createGitlabQuery,
} from '@/shared/lib/gitlab/connection/create-query';
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

    this.linkedPipelineQuery = createGitlabQuery<GitLabPipelineDC>({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const { projectId } = this.parentViewModel;
        const pipelineId = this.linkedPipelineId;
        return (
          projectId !== null &&
          pipelineId !== null && {
            path: `/projects/${projectId}/pipelines/${pipelineId}`,
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

    this.jobs = createGitlabApiQuery<
      GitLabJobDC[],
      { projectId: number; pipelineId: number }
    >({
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
        globals.stores.settings.activeItem?.credentialsRevision,
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

  @actionBound
  async runJob(job: GitLabJobDC) {
    const run = this.selectedPipeline;
    await this.pipelineList.runJobAction(job);
    if (run && run.id === this.selectedPipeline?.id) await this.jobs.refetch();
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
