import { actionBound, computed, observable, reaction } from 'mobx';
import { createRef } from 'yummies/mobx';
import type { GitLabCommitDC } from '@/shared/api/gitlab';
import { createRepositoryCommitsQuery } from '@/shared/api/gitlab/queries/repository';
import { t } from '@/shared/lib/i18n';
import type { Globals } from '@/shared/model/globals';

export interface RepositoryCommitsParams {
  globals: Globals;
  abortSignal: AbortSignal;
  projectId: () => number | null;
  branchRef: () => string | null;
}

export class RepositoryCommitsModel {
  commitsQuery;
  readonly listContainer = createRef<HTMLDivElement>();
  @observable private accessor lastVisibleIndex: number | undefined;

  @observable accessor selectedCommitSha: string | null = null;

  constructor(private readonly params: RepositoryCommitsParams) {
    this.commitsQuery = createRepositoryCommitsQuery({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => {
        const projectId = params.projectId();
        const refName = params.branchRef();

        if (projectId === null || !refName) {
          return false;
        }

        return { projectId, refName };
      },
    });
    reaction(
      () =>
        this.listContainer.current &&
        this.canLoadMore &&
        this.lastVisibleIndex !== undefined &&
        this.lastVisibleIndex >= this.commits.length - 5,
      (nearEnd) => {
        if (nearEnd) this.loadMore();
      },
      { signal: params.abortSignal },
    );
  }

  @actionBound
  updateVisibleRange(index: number | undefined) {
    this.lastVisibleIndex = index;
  }

  @computed
  get commits() {
    return (this.commitsQuery.data?.pages ?? []).flatMap((page) => page.items);
  }

  @computed
  get ref() {
    return this.selectedCommitSha ?? this.params.branchRef();
  }

  @computed
  get isLoading() {
    return this.commitsQuery.isLoading || this.commitsQuery.isFetching;
  }

  @computed
  get isFetchingNextPage() {
    return this.commitsQuery.isFetchingNextPage;
  }

  @computed
  get errorMessage() {
    const error = this.commitsQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error
      ? error.message
      : t('files.couldNotLoadCommits');
  }

  @computed
  get canLoadMore() {
    return (
      this.commitsQuery.hasNextPage &&
      !this.isLoading &&
      !this.isFetchingNextPage
    );
  }

  @computed
  get activeCommit() {
    if (this.selectedCommitSha) {
      return (
        this.commits.find((commit) => commit.id === this.selectedCommitSha) ??
        null
      );
    }

    return this.commits[0] ?? null;
  }

  @computed
  get buttonLabel() {
    const commit = this.activeCommit;
    if (!commit) {
      return t('common.commit');
    }

    return commit.short_id;
  }

  isCommitSelected(commit: GitLabCommitDC) {
    if (this.selectedCommitSha) {
      return commit.id === this.selectedCommitSha;
    }

    return this.commits[0]?.id === commit.id;
  }

  @actionBound
  selectCommit(commit: GitLabCommitDC) {
    if (!this.selectedCommitSha && this.commits[0]?.id === commit.id) {
      this.selectedCommitSha = null;
      return;
    }

    this.selectedCommitSha = commit.id;
  }

  @actionBound
  reset() {
    this.selectedCommitSha = null;
  }

  @actionBound
  loadMore() {
    if (!this.canLoadMore) {
      return;
    }

    void this.commitsQuery.fetchNextPage();
  }
}
