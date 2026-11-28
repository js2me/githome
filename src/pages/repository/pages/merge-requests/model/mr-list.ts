import { actionBound, computed, observable } from 'mobx';
import type { Workspace } from '@/features/workspace-navigation';
import type {
  GitLabMergeRequestDC,
  GitLabProjectDC,
} from '@/shared/api/gitlab';
import { createProjectMergeRequestListQuery } from '@/shared/api/gitlab/queries/merge-requests/list';
import { t } from '@/shared/lib/i18n';

export const MR_FILTERS = [
  {
    id: 'opened',
    labelKey: 'review.open2',
    emptyKey: 'review.noOpenMergeRequestsYet',
  },
  {
    id: 'mine',
    labelKey: 'review.mine',
    emptyKey: 'review.youHaveNotOpenedAnyMergeRequests',
  },
  {
    id: 'merged',
    labelKey: 'review.merged2',
    emptyKey: 'review.noMergedRequestsYet',
  },
  {
    id: 'closed',
    labelKey: 'review.closed2',
    emptyKey: 'review.noClosedMergeRequestsYet',
  },
] as const;

type MrFilterId = (typeof MR_FILTERS)[number]['id'];

export interface MrListParams {
  globals: Workspace;
  readonly unmountSignal: AbortSignal;
  readonly projectId: number | null;
  readonly selectedProject: GitLabProjectDC | null;
  readonly mergeRequestIid: number | null;
}

export class MrList {
  mergeRequestsQuery;
  @observable accessor searchText: string;
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor(private params: MrListParams) {
    this.searchText = this.appliedSearch;
    params.unmountSignal.addEventListener(
      'abort',
      () => clearTimeout(this.searchTimer),
      { once: true },
    );

    this.mergeRequestsQuery = createProjectMergeRequestListQuery({
      globals: params.globals,
      abortSignal: params.unmountSignal,
      params: () => {
        const projectId = params.projectId;
        if (
          projectId === null ||
          !params.globals.routes.mergeRequests.isOpened
        ) {
          return false;
        }

        return {
          projectId,
          search: this.appliedSearch,
          filter: this.activeFilter.id,
        };
      },
    });
  }

  @computed
  get appliedSearch() {
    const search = this.params.globals.query.data.q;
    return typeof search === 'string' ? search.trim() : '';
  }

  @computed
  get activeFilter() {
    const filter = this.params.globals.query.data.state;
    return MR_FILTERS.find(({ id }) => id === filter) ?? MR_FILTERS[0];
  }

  @computed
  get resultCount() {
    const pages = this.mergeRequestsQuery.data?.pages;
    if (!pages?.length) return null;
    const count = this.mergeRequests.length;
    return pages[0].total ?? (this.canLoadMore ? `${count}+` : count);
  }

  @computed
  get pages() {
    return this.mergeRequestsQuery.data?.pages ?? [];
  }

  @computed
  get mergeRequests(): GitLabMergeRequestDC[] {
    return this.pages.flatMap((page) => page.items);
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
      : t('review.couldNotLoadMergeRequests');
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
      !this.isLoading && !this.errorMessage && this.mergeRequests.length === 0
    );
  }

  @computed
  get showList() {
    return this.mergeRequests.length > 0;
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
      this.setFilter(this.activeFilter.id);
    }
  }

  @actionBound
  setFilter(id: MrFilterId) {
    clearTimeout(this.searchTimer);
    if (!this.params.globals.routes.mergeRequests.isOpened) return;
    this.params.globals.query.update(
      {
        state: id === 'opened' ? null : id,
        q: this.searchText.trim() || null,
      },
      true,
    );
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
