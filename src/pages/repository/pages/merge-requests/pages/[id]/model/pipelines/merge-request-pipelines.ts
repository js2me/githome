import { actionBound, computed, observable } from 'mobx';
import type {
  GitLabMergeRequestDC,
  GitLabPipelineSummaryDC,
} from '@/shared/api/gitlab';
import {
  createGitlabQuery,
  createInfiniteGitlabQuery,
} from '@/shared/lib/gitlab/connection/create-query';
import type { Globals } from '@/shared/model/globals';
import {
  mergeRequestHeadSha,
  pipelineHistory,
  pipelineSelectionKey,
  type SelectedPipeline,
  selectPipelines,
} from './select-pipelines';

interface Options {
  globals: Globals;
  abortSignal: AbortSignal;
  target: () => { projectId: number; mr: GitLabMergeRequestDC } | null;
}

const polling = { refetchInterval: 15_000, staleTime: 5000, retry: false };

export class MergeRequestPipelines {
  private readonly mrRuns;
  private readonly branchRuns;
  @observable private accessor selection: {
    scope: string;
    item: SelectedPipeline;
  } | null = null;

  @computed
  private get scope() {
    const target = this.options.target();
    const connection = this.options.globals.stores.settings.activeConnection;
    return target && connection
      ? `${connection.id}/${connection.credentialsRevision}/${target.projectId}/${target.mr.iid}`
      : null;
  }

  constructor(private readonly options: Options) {
    const { globals, abortSignal, target } = options;
    this.mrRuns = createInfiniteGitlabQuery<GitLabPipelineSummaryDC>({
      globals,
      abortSignal,
      params: () => {
        const context = target();
        return (
          context && {
            path: `/projects/${context.projectId}/merge_requests/${context.mr.iid}/pipelines`,
            query: { per_page: 30 },
          }
        );
      },
      queryOptions: polling,
    });
    this.branchRuns = createGitlabQuery<GitLabPipelineSummaryDC[]>({
      globals,
      abortSignal,
      params: () => {
        const context = target();
        if (!context) return false;
        const { mr } = context;
        const projectId =
          mr.source_project_id === undefined
            ? context.projectId
            : mr.source_project_id;
        const sha = mergeRequestHeadSha(mr);
        if (!projectId || !sha || !mr.source_branch) return false;
        return {
          path: `/projects/${projectId}/pipelines`,
          query: {
            scope: 'branches',
            ref: mr.source_branch,
            sha,
            order_by: 'id',
            sort: 'desc',
          },
        };
      },
      queryOptions: polling,
    });
  }

  @computed
  get cards() {
    const context = this.options.target();
    return context
      ? selectPipelines(
          context.mr,
          context.projectId,
          this.loadedMrRuns,
          this.branchRuns.data ?? [],
        )
      : [];
  }

  @computed
  private get loadedMrRuns() {
    return this.mrRuns.data?.pages.flatMap(({ items }) => items) ?? [];
  }

  @computed
  get history() {
    const context = this.options.target();
    if (!context) return [];
    return pipelineHistory(
      context.projectId,
      this.loadedMrRuns,
      this.cards,
      this.branchRuns.data ?? [],
    );
  }

  @computed
  get selected() {
    if (!this.selection || this.selection.scope !== this.scope) return null;
    const key = pipelineSelectionKey(this.selection.item);
    return (
      this.history.find((item) => pipelineSelectionKey(item) === key) ??
      this.selection.item
    );
  }

  @computed
  get historyLoading() {
    return this.mrRuns.isLoading || this.branchRuns.isLoading;
  }

  @computed
  get refreshing() {
    return this.mrRuns.isFetching || this.branchRuns.isFetching;
  }

  @computed
  get hasMore() {
    return this.mrRuns.hasNextPage;
  }

  @actionBound
  open(item = this.cards[0] ?? this.history[0]) {
    if (item && this.scope) this.selection = { scope: this.scope, item };
  }

  @actionBound
  close() {
    this.selection = null;
  }

  @actionBound
  loadMore() {
    if (this.hasMore && !this.mrRuns.isFetching)
      void this.mrRuns.fetchNextPage();
  }

  @actionBound
  refresh() {
    void this.mrRuns.refetch();
    const context = this.options.target();
    if (
      context &&
      context.mr.source_project_id !== null &&
      context.mr.source_branch &&
      mergeRequestHeadSha(context.mr)
    ) {
      void this.branchRuns.refetch();
    }
  }

  @computed
  get hasError() {
    return Boolean(this.mrRuns.error || this.branchRuns.error);
  }
}
