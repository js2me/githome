import { actionBound, computed, observable, reaction } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import type { ReactNode } from 'react';
import { createRef } from 'yummies/mobx';
import type { PipelineJobAction } from '@/entities/gitlab-pipelines';
import {
  type GitLabJobDC,
  type GitLabPipelineSummaryDC,
  gitlabApi,
} from '@/shared/api/gitlab';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/connection/create-query';
import { getLocale } from '@/shared/lib/i18n';
import { VM } from '@/shared/lib/view-models/vm';
import type { Globals } from '@/shared/model/globals';

interface PipelineDetailsDialogProps {
  projectId: number;
  projectPath?: string;
  pipelineId: number;
  pipeline?: Partial<GitLabPipelineSummaryDC>;
  kindLabel?: string;
  manager?: { heading: string; history: ReactNode };
  jobs: readonly GitLabJobDC[];
  loading: boolean;
  error?: string | null;
  description?: ReactNode;
  actions?: ReactNode;
  jobControls?: {
    blocked?: boolean;
    pendingAction: (jobId: number) => PipelineJobAction | undefined;
    run: (jobs: readonly GitLabJobDC[]) => Promise<void>;
  };
  onRefresh: () => void;
  refreshing: boolean;
  onClose: () => void;
}

export class PipelineDetailsDialogVM extends VM<PipelineDetailsDialogProps> {
  readonly dialog = createRef<HTMLDialogElement>();
  readonly closeButton = createRef<HTMLButtonElement>();
  readonly stageOrder;
  @observable private accessor selectedJobId: number | null = null;
  @observable accessor jobSearch = '';
  @observable accessor jobStatus = '';

  @computed
  get jobStatuses() {
    const statuses = new Set(this.payload.jobs.map(({ status }) => status));
    if (this.jobStatus) statuses.add(this.jobStatus);
    return [...statuses];
  }

  @computed
  get hasJobFilter() {
    return Boolean(this.jobSearch.trim() || this.jobStatus);
  }

  @computed
  get visibleJobs() {
    const term = this.jobSearch.trim().toLowerCase();
    return this.payload.jobs.filter(
      (job) =>
        (!this.jobStatus || job.status === this.jobStatus) &&
        (!term ||
          job.name.toLowerCase().includes(term) ||
          job.stage.toLowerCase().includes(term)),
    );
  }

  @actionBound
  setJobSearch(value: string) {
    this.jobSearch = value;
  }

  @actionBound
  setJobStatus(value: string) {
    this.jobStatus = value;
  }

  @actionBound
  private resetJobFilters() {
    this.jobSearch = '';
    this.jobStatus = '';
    this.selectedJobId = null;
  }

  constructor(
    globals: Globals,
    params: ViewModelParams<PipelineDetailsDialogProps>,
  ) {
    super(globals, params);
    this.stageOrder = createGitlabApiQuery<
      string[],
      { projectPath: string; pipelineId: number }
    >({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const { projectPath, pipelineId } = this.payload;
        return projectPath ? { projectPath, pipelineId } : false;
      },
      queryKey: ({ connection, projectPath, pipelineId }) => [
        'pipeline-stage-order',
        connection.id,
        connection.credentialsRevision,
        projectPath,
        pipelineId,
      ],
      queryFn: ({ connection, projectPath, pipelineId, signal }) =>
        gitlabApi.getPipelineStages(
          connection,
          projectPath,
          pipelineId,
          signal,
        ),
      queryOptions: { staleTime: 300_000, retry: false },
    });
  }

  @computed
  get selectedJob() {
    return this.visibleJobs.find(({ id }) => id === this.selectedJobId);
  }

  @actionBound
  toggleJob(id: number) {
    this.selectedJobId = this.selectedJobId === id ? null : id;
  }

  revealJobDetails(element: HTMLDivElement | null) {
    element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  @actionBound
  refresh() {
    this.payload.onRefresh();
    if (this.payload.projectPath) void this.stageOrder.refetch();
  }

  @computed
  get stages() {
    const stages = new Map<string, GitLabJobDC[]>(
      this.stageOrder.data?.map((name) => [name, []]),
    );
    for (const job of [...this.visibleJobs].reverse()) {
      const stage = stages.get(job.stage);
      if (stage) stage.push(job);
      else stages.set(job.stage, [job]);
    }
    const collator = new Intl.Collator(getLocale(), { numeric: true });
    return [...stages].flatMap(([stage, jobs]) =>
      jobs.length
        ? [
            {
              stage,
              jobs: jobs.sort((a, b) => collator.compare(a.name, b.name)),
            },
          ]
        : [],
    );
  }

  willMount() {
    reaction(
      () => `${this.payload.projectId}/${this.payload.pipelineId}`,
      this.resetJobFilters,
      { signal: this.unmountSignal },
    );
    reaction(
      () => this.dialog.current,
      (dialog) => {
        if (!dialog) return;
        dialog.showModal();
        this.closeButton.current?.focus({ preventScroll: true });
        return () => {
          if (dialog.open) dialog.close();
        };
      },
      { fireImmediately: true, signal: this.unmountSignal },
    );
  }
}
