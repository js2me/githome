import { actionBound, computed, observable } from 'mobx';
import type { Workspace } from '@/features/workspace-navigation';
import { createMergeRequestCommitsQuery } from '@/shared/api/gitlab/queries/merge-requests/diff';
import { createCommitDiffQuery } from '@/shared/api/gitlab/queries/repository';

export class MrCommits {
  @observable accessor enabled = false;
  readonly query;
  readonly diffQuery;

  constructor(
    private readonly globals: Workspace,
    abortSignal: AbortSignal,
    target: () => { projectId: number | null; iid: number | null },
  ) {
    this.query = createMergeRequestCommitsQuery({
      globals,
      abortSignal,
      params: () => {
        const { projectId, iid } = target();
        return (this.enabled || this.selectedId) && projectId && iid
          ? {
              projectId,
              iid,
            }
          : null;
      },
      queryOptions: { staleTime: 30_000 },
    });
    this.diffQuery = createCommitDiffQuery({
      globals,
      abortSignal,
      params: () => {
        const { projectId } = target();
        return projectId && this.selected
          ? {
              projectId,
              commitId: this.selected.id,
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
