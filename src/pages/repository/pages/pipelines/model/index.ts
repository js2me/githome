import { actionBound, observable, reaction } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import type { Workspace } from '@/features/workspace-navigation';
import { WorkspaceVM } from '@/features/workspace-navigation';
import {
  type GitLabJobDC,
  type GitLabPipelineDC,
  gitlabApi,
} from '@/shared/api/gitlab';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/create-query';
import type { RepositoryPageVM } from '../../../model/page-vm';
import { isPipelineActive, PipelineList } from './pipeline-list';

export class PipelinesPageVM extends WorkspaceVM<{}, RepositoryPageVM> {
  readonly pipelineList: PipelineList;
  readonly jobs;
  readonly trace;
  @observable accessor traceJobId: number | null = null;

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
    this.trace = createGitlabApiQuery<
      string,
      { projectId: number; jobId: number }
    >({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const run = this.pipelineList.openedRun;
        return (
          run &&
          this.traceJobId !== null && {
            projectId: run.project_id,
            jobId: this.traceJobId,
          }
        );
      },
      queryKey: ({ connection, projectId, jobId }) => [
        'pipeline-job-trace',
        connection.id,
        connection.credentialsRevision,
        projectId,
        jobId,
      ],
      queryFn: ({ connection, projectId, jobId, signal }) =>
        gitlabApi.getPipelineJobTrace(connection, projectId, jobId, signal),
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

  @actionBound
  openDetails(run: GitLabPipelineDC) {
    this.pipelineList.selectPipeline(run);
    this.traceJobId = null;
  }

  @actionBound
  closeDetails() {
    this.pipelineList.selectPipeline(null);
    this.traceJobId = null;
  }

  @actionBound
  toggleTrace(jobId: number) {
    this.traceJobId = this.traceJobId === jobId ? null : jobId;
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
