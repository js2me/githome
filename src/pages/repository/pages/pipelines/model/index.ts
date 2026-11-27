import { actionBound, reaction } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import { isPipelineActive } from '@/entities/gitlab-pipelines';
import type { Workspace } from '@/features/workspace-navigation';
import { WorkspaceVM } from '@/features/workspace-navigation';
import {
  type GitLabJobDC,
  type GitLabPipelineDC,
  gitlabApi,
} from '@/shared/api/gitlab';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/connection/create-query';
import type { RepositoryPageVM } from '../../../model/page-vm';
import { PipelineList } from './pipeline-list';

export class PipelinesPageVM extends WorkspaceVM<{}, RepositoryPageVM> {
  readonly pipelineList: PipelineList;
  readonly jobs;

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

    this.jobs = createGitlabApiQuery<
      GitLabJobDC[],
      { projectId: number; pipelineId: number }
    >({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const run = this.pipelineList.openedRun;
        return run && { projectId: run.project_id, pipelineId: run.id };
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
          const run = this.pipelineList.selectedPipeline;
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
      this.closeDetails,
      { signal: this.unmountSignal },
    );
  }

  get projectPath() {
    return this.parentViewModel.project?.path_with_namespace;
  }

  @actionBound
  refreshDetails() {
    this.pipelineList.refresh();
    void this.jobs.refetch();
  }

  @actionBound
  openDetails(run: GitLabPipelineDC) {
    this.pipelineList.selectPipeline(run);
  }

  @actionBound
  closeDetails() {
    this.pipelineList.selectPipeline(null);
  }

  @actionBound
  async runJob(job: GitLabJobDC) {
    const run = this.pipelineList.openedRun;
    await this.pipelineList.runJobAction(job);
    if (run && run === this.pipelineList.openedRun) await this.jobs.refetch();
  }

  @actionBound
  async runPipeline(run: GitLabPipelineDC, action: 'retry' | 'cancel') {
    await this.pipelineList.runPipelineAction(run, action);
    if (this.pipelineList.openedRun?.id === run.id) await this.jobs.refetch();
  }
}
