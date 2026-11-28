import { actionBound, computed, observable } from 'mobx';
import type { Workspace } from '@/features/workspace-navigation';
import type {
  GitLabCommitDC,
  GitLabMergeRequestChangeDC,
} from '@/shared/api/gitlab';
import { createInfiniteGitlabQuery } from '@/shared/lib/gitlab/connection/create-query';

export class MrCommits {
  @observable accessor enabled = false;
  readonly query;
  readonly diffQuery;

  constructor(
    private readonly globals: Workspace,
    abortSignal: AbortSignal,
    target: () => { projectId: number | null; iid: number | null },
  ) {
    this.query = createInfiniteGitlabQuery<GitLabCommitDC>({
      globals,
      abortSignal,
      params: () => {
        const { projectId, iid } = target();
        return (this.enabled || this.selectedId) && projectId && iid
          ? {
              path: `/projects/${projectId}/merge_requests/${iid}/commits`,
              query: { per_page: 50 },
            }
          : null;
      },
      queryOptions: { staleTime: 30_000 },
    });
    this.diffQuery = createInfiniteGitlabQuery<GitLabMergeRequestChangeDC>({
      globals,
      abortSignal,
      params: () => {
        const { projectId } = target();
        return projectId && this.selected
          ? {
              path: `/projects/${projectId}/repository/commits/${this.selected.id}/diff`,
              query: { per_page: 100 },
            }
          : null;
      },
      queryOptions: { staleTime: 60_000 },
    });
  }

  @computed
  get selectedId() {
    const { view, commit } = this.globals.query.data;
    return view === 'changes' && commit && /^[0-9a-f]{40,64}$/i.test(commit)
      ? commit
      : null;
  }

  @computed
  get items() {
    return this.query.data?.pages.flatMap(({ items }) => items) ?? [];
  }

  @computed
  get selected() {
    return this.items.find(({ id }) => id === this.selectedId);
  }

  @computed
  get changes() {
    return this.diffQuery.data?.pages.flatMap(({ items }) => items) ?? [];
  }

  @actionBound
  load() {
    this.enabled = true;
  }

  @actionBound
  loadMore() {
    void this.query.fetchNextPage();
  }

  @actionBound
  loadMoreDiffs() {
    void this.diffQuery.fetchNextPage();
  }
}
