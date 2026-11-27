import { computed } from 'mobx';
import type {
  GitLabMergeRequestDC,
  GitLabPipelineSummaryDC,
} from '@/shared/api/gitlab';
import { createGitlabQuery } from '@/shared/lib/gitlab/connection/create-query';
import type { Globals } from '@/shared/model/globals';
import { mergeRequestHeadSha, selectPipelines } from './select-pipelines';

interface Options {
  globals: Globals;
  abortSignal: AbortSignal;
  target: () => { projectId: number; mr: GitLabMergeRequestDC } | null;
}

const polling = { refetchInterval: 15_000, staleTime: 5000, retry: false };

export class MergeRequestPipelines {
  private readonly mrRuns;
  private readonly branchRuns;

  constructor(private readonly options: Options) {
    const { globals, abortSignal, target } = options;
    this.mrRuns = createGitlabQuery<GitLabPipelineSummaryDC[]>({
      globals,
      abortSignal,
      params: () => {
        const context = target();
        return (
          context && {
            path: `/projects/${context.projectId}/merge_requests/${context.mr.iid}/pipelines`,
            query: { per_page: 100 },
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
          this.mrRuns.data ?? [],
          this.branchRuns.data ?? [],
        )
      : [];
  }

  @computed
  get hasError() {
    return Boolean(this.mrRuns.error || this.branchRuns.error);
  }
}
