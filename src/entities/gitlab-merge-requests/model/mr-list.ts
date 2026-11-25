import { actionBound, computed, observable } from "mobx";
import { gitlabApi } from "@/shared/api/gitlab";
import type { GitLabMergeRequestDC, GitLabProjectDC } from "@/shared/api/gitlab";
import {
  createGitlabApiQuery,
  createInfiniteGitlabQuery,
} from "@/shared/lib/gitlab/create-query";
import type { Globals } from "@/globals";

export const MR_STATES = [
  { id: "opened", label: "Открытые", empty: "Открытых merge requests пока нет" },
  { id: "merged", label: "Слитые", empty: "Слитых merge requests пока нет" },
  { id: "closed", label: "Закрытые", empty: "Закрытых merge requests пока нет" },
] as const;

type MrState = (typeof MR_STATES)[number];

export interface MrListParams {
  globals: Globals;
  readonly unmountSignal: AbortSignal;
  readonly projectId: number | null;
  readonly selectedProject: GitLabProjectDC | null;
  readonly mergeRequestIid: number | null;
}

export class MrList {
  mergeRequestsQuery;
  mergeRequestApprovalCountsQuery;
  @observable accessor searchText: string;
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor(private params: MrListParams) {
    this.searchText = this.appliedSearch;
    params.unmountSignal.addEventListener("abort", () => clearTimeout(this.searchTimer), { once: true });

    this.mergeRequestsQuery = createInfiniteGitlabQuery<GitLabMergeRequestDC>({
      globals: params.globals,
      abortSignal: params.unmountSignal,
      params: () => {
        const projectId = params.projectId;
        if (projectId === null || !params.globals.routes.mergeRequests.isOpened) {
          return false;
        }

        const search = this.appliedSearch;
        const iid = search.match(/^!?(\d+)$/)?.[1];
        const title = iid ? undefined : search || undefined;
        return {
          path: `/projects/${projectId}/merge_requests`,
          query: {
            state: this.activeState.id,
            "iids[]": iid,
            search: title,
            in: title ? "title" : undefined,
            order_by: "updated_at",
            sort: "desc",
            per_page: 20,
          },
        };
      },
    });

    this.mergeRequestApprovalCountsQuery = createGitlabApiQuery<
      Record<number, number>,
      { project: GitLabProjectDC; mergeRequestIids: number[] }
    >({
      globals: params.globals,
      abortSignal: params.unmountSignal,
      params: () => {
        const project = params.selectedProject;
        const mergeRequestIids = this.mergeRequests.map(
          (mergeRequest) => mergeRequest.iid,
        );

        if (!project || mergeRequestIids.length === 0) {
          return false;
        }

        return { project, mergeRequestIids };
      },
      queryKey: ({ connection, project, mergeRequestIids }) =>
        [
          "merge-request-list-approval-counts",
          connection.gitlabUrl,
          project.id,
          mergeRequestIids,
        ] as const,
      queryFn: ({ connection, project, mergeRequestIids, signal }) =>
        gitlabApi.getMergeRequestApprovalCounts(
          connection,
          project,
          mergeRequestIids,
          signal,
        ),
    });
  }

  @computed
  get appliedSearch() {
    const search = this.params.globals.query.data.q;
    return typeof search === "string" ? search.trim() : "";
  }

  @computed
  get activeState() {
    const state = this.params.globals.query.data.state;
    return MR_STATES.find(({ id }) => id === state) ?? MR_STATES[0];
  }

  @computed
  get resultCount() {
    const pages = this.mergeRequestsQuery.data?.pages;
    if (!pages?.length) return null;
    const count = this.mergeRequests.length;
    return pages[0].total ?? (this.canLoadMore ? `${count}+` : count);
  }

  @computed
  get mergeRequests(): GitLabMergeRequestDC[] {
    return (this.mergeRequestsQuery.data?.pages ?? []).flatMap(
      (page) => page.items,
    );
  }

  @computed
  get isLoading() {
    return this.mergeRequestsQuery.isLoading;
  }

  @computed
  get isFetchingNextPage() {
    return this.mergeRequestsQuery.isFetchingNextPage;
  }

  @computed
  get isFetching() {
    return this.mergeRequestsQuery.isFetching;
  }

  @computed
  get canLoadMore() {
    return this.mergeRequestsQuery.hasNextPage && !this.isLoading;
  }

  @computed
  get errorMessage() {
    const error = this.mergeRequestsQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error
      ? error.message
      : "Не удалось загрузить merge requests";
  }

  @computed
  get selectedMergeRequestIid() {
    return this.params.mergeRequestIid;
  }

  @computed
  get showLoadError() {
    return Boolean(this.errorMessage) && !this.isLoading;
  }

  @computed
  get showEmptyListMessage() {
    return (
      !this.isLoading &&
      !this.errorMessage &&
      this.mergeRequests.length === 0
    );
  }

  @computed
  get showList() {
    return this.mergeRequests.length > 0;
  }

  @computed
  get approvalCounts(): Record<number, number> {
    return this.mergeRequestApprovalCountsQuery.data ?? {};
  }

  @actionBound
  setSearchText(value: string) {
    this.searchText = value;
    clearTimeout(this.searchTimer);
    if (value.trim()) {
      this.searchTimer = setTimeout(this.applySearch, 250);
    } else {
      this.applySearch();
    }
  }

  @actionBound
  applySearch() {
    if (this.searchText.trim() !== this.appliedSearch) {
      this.setState(this.activeState);
    }
  }

  @actionBound
  setState(state: MrState) {
    clearTimeout(this.searchTimer);
    if (!this.params.globals.routes.mergeRequests.isOpened) return;
    this.params.globals.query.update({
      state: state.id === "opened" ? null : state.id,
      q: this.searchText.trim() || null,
    }, true);
  }

  @actionBound
  retry() {
    if (this.mergeRequestsQuery.isFetchNextPageError) {
      this.loadMore();
    } else {
      void this.mergeRequestsQuery.refetch();
    }
  }

  @actionBound
  loadMore() {
    if (this.canLoadMore && !this.isFetching) {
      void this.mergeRequestsQuery.fetchNextPage();
    }
  }

  @actionBound
  openMergeRequest(mergeRequest: GitLabMergeRequestDC) {
    const projectId = this.params.projectId;
    const project = this.params.selectedProject;
    const connectionId = this.params.globals.stores.settings.activeId;
    if (projectId === null || !connectionId) {
      return;
    }

    if (!project) {
      void this.params.globals.routes.mergeRequest.open({
        projectId: String(projectId),
        mergeRequestIid: String(mergeRequest.iid),
      });
      return;
    }

    this.params.globals.navigation.mergeRequests.open(
      connectionId,
      project,
      mergeRequest.iid,
      mergeRequest.title,
    );
  }
}
