import { actionBound, computed, observable, reaction } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import { isPipelineActive } from '@/entities/gitlab-pipelines';
import { gitlabApi } from '@/shared/api/gitlab';
import { GitLabApiError } from '@/shared/api/gitlab/client';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/connection/create-query';
import { t } from '@/shared/lib/i18n';
import { VM } from '@/shared/lib/view-models/vm';
import type { Globals } from '@/shared/model/globals';
import { formatJobTrace } from './format-job-trace';

const isAccessError = (error: unknown) =>
  error instanceof GitLabApiError &&
  (error.status === 401 || error.status === 403);

interface JobLogProps {
  projectId: number;
  jobId: number;
  status: string;
  name: string;
}

export class JobLogVM extends VM<JobLogProps> {
  readonly trace;
  private observer?: MutationObserver;
  private follow?: boolean;
  @observable accessor filter = '';

  @actionBound
  setFilter(value: string) {
    this.filter = value;
  }

  @computed
  get visibleText() {
    const needle = this.filter.trim().toLowerCase();
    if (!needle) return this.text;
    return this.text
      .split('\n')
      .filter((line) => line.toLowerCase().includes(needle))
      .join('\n');
  }

  @actionBound
  attachOutput(element: HTMLPreElement | null) {
    this.observer?.disconnect();
    this.observer = undefined;
    if (!element) return;

    const scroll = () => {
      if (this.follow ?? this.isLive) element.scrollTop = element.scrollHeight;
    };
    scroll();
    this.observer = new MutationObserver(scroll);
    this.observer.observe(element, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  @actionBound
  trackScroll(element: HTMLPreElement) {
    this.follow =
      element.scrollHeight - element.scrollTop - element.clientHeight < 16;
  }

  @actionBound
  refresh() {
    if (!this.trace.isFetching) void this.trace.refetch();
  }

  @actionBound
  download() {
    const url = URL.createObjectURL(
      new Blob([this.text], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-${this.payload.jobId}.log`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  constructor(globals: Globals, params: ViewModelParams<JobLogProps>) {
    super(globals, params);
    this.trace = createGitlabApiQuery<
      string,
      { projectId: number; jobId: number }
    >({
      globals,
      abortSignal: this.unmountSignal,
      params: () => ({
        projectId: this.payload.projectId,
        jobId: this.payload.jobId,
      }),
      queryKey: ({ connection, projectId, jobId }) => [
        'pipeline-job-trace',
        connection.id,
        connection.credentialsRevision,
        projectId,
        jobId,
      ],
      queryFn: ({ connection, projectId, jobId, signal }) =>
        gitlabApi.getPipelineJobTrace(connection, projectId, jobId, signal),
      queryOptions: {
        staleTime: 0,
        gcTime: 0,
        retry: false,
        refetchOnWindowFocus: false,
        refetchInterval: ({ state }) => {
          const error = state.error;
          if (isAccessError(error)) return false;
          return this.isLive
            ? error instanceof GitLabApiError && error.status === 429
              ? Math.max(5000, error.retryAfterMs ?? 0)
              : 5000
            : false;
        },
      },
    });
  }

  willMount() {
    reaction(
      () => this.payload.status,
      (status, previous) => {
        if (isPipelineActive(previous) !== isPipelineActive(status)) {
          // Fetch once at completion so the final lines are not missed.
          void this.trace.refetch();
        }
      },
      { signal: this.unmountSignal },
    );
  }

  @computed
  get isLive() {
    return isPipelineActive(this.payload.status);
  }

  @computed
  get isAutoRefreshing() {
    return this.isLive && !isAccessError(this.trace.error);
  }

  @computed
  get text() {
    return formatJobTrace(this.trace.data ?? '');
  }

  get errorMessage() {
    const error = this.trace.error;
    if (!error) return null;
    if (error instanceof GitLabApiError && error.status === 404) {
      return t('pipelines.jobLogUnavailable');
    }
    return error instanceof Error
      ? error.message
      : t('pipelines.couldNotLoadTheLog');
  }
}
