import { action, computed, observable } from "mobx";
import type { GitLabCommitDC } from "@/shared/api/gitlab";
import type { Globals } from "@/globals";
import { createInfiniteGitlabQuery } from "@/shared/lib/gitlab/create-query";

const COMMITS_PER_PAGE = 30;

export interface RepositoryCommitsParams {
  globals: Globals;
  abortSignal: AbortSignal;
  projectId: () => number | null;
  branchRef: () => string | null;
}

export class RepositoryCommitsModel {
  commitsQuery;

  @observable accessor selectedCommitSha: string | null = null;

  constructor(private readonly params: RepositoryCommitsParams) {
    this.commitsQuery = createInfiniteGitlabQuery<GitLabCommitDC>({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => {
        const projectId = params.projectId();
        const refName = params.branchRef();

        if (projectId === null || !refName) {
          return false;
        }

        return {
          path: `/projects/${projectId}/repository/commits`,
          query: {
            ref_name: refName,
            per_page: COMMITS_PER_PAGE,
          },
        };
      },
    });
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
      : "Не удалось загрузить коммиты";
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
      return "Коммит";
    }

    return commit.short_id;
  }

  isCommitSelected(commit: GitLabCommitDC) {
    if (this.selectedCommitSha) {
      return commit.id === this.selectedCommitSha;
    }

    return this.commits[0]?.id === commit.id;
  }

  @action.bound
  selectCommit(commit: GitLabCommitDC) {
    if (!this.selectedCommitSha && this.commits[0]?.id === commit.id) {
      this.selectedCommitSha = null;
      return;
    }

    this.selectedCommitSha = commit.id;
  }

  @action.bound
  reset() {
    this.selectedCommitSha = null;
  }

  @action.bound
  loadMore() {
    if (!this.canLoadMore) {
      return;
    }

    void this.commitsQuery.fetchNextPage();
  }
}
