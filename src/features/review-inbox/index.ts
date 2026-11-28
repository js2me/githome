import { actionBound, computed, observable } from 'mobx';
import type { Workspace } from '@/features/workspace-navigation';
import type { GitLabMergeRequestDC } from '@/shared/api/gitlab';
import { createConnectionUserIdQuery } from '@/shared/lib/gitlab/connection/connection-profile-query';
import { createInfiniteGitlabQuery } from '@/shared/lib/gitlab/connection/create-query';

type InboxScope = 'reviewer' | 'author';

type InboxRequest = GitLabMergeRequestDC & {
  project_id: number;
  references?: { full?: string };
};

export type InboxRow = InboxRequest & { projectPath: string };

const numberFrom = (term: string) => /^!?([1-9]\d*)$/.exec(term)?.[1];

export class ReviewInbox {
  @observable accessor scope: InboxScope;
  @observable accessor filter = '';
  @observable private accessor remoteTerm = '';

  readonly userQuery;
  readonly query;
  private readonly searchQuery;
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly globals: Workspace,
    abortSignal: AbortSignal,
    scope: InboxScope = 'reviewer',
    private readonly projectPath?: (projectId: number) => string | undefined,
  ) {
    this.scope = scope;
    this.userQuery = createConnectionUserIdQuery(
      () => globals.stores.settings.activeConnection,
      abortSignal,
    );
    const paramsFor = (term = '') => {
      const reviewerId = this.userQuery.data;
      if (this.scope === 'reviewer' && !reviewerId) return null;

      const iid = numberFrom(term);
      return {
        path: '/merge_requests',
        query: {
          state: 'opened',
          order_by: 'updated_at',
          sort: 'desc',
          per_page: term ? 20 : 10,
          ...(this.scope === 'reviewer'
            ? { scope: 'all', reviewer_id: reviewerId }
            : { scope: 'created_by_me' }),
          ...(iid
            ? { 'iids[]': iid }
            : term
              ? { search: term, in: 'title' }
              : {}),
        },
      };
    };

    this.query = createInfiniteGitlabQuery<InboxRequest>({
      globals,
      abortSignal,
      params: () => paramsFor(),
      queryOptions: { staleTime: 30_000 },
    });

    this.searchQuery = createInfiniteGitlabQuery<InboxRequest>({
      globals,
      abortSignal,
      params: () => (this.remoteTerm ? paramsFor(this.remoteTerm) : null),
      queryOptions: { staleTime: 30_000 },
    });
    abortSignal.addEventListener(
      'abort',
      () => clearTimeout(this.searchTimer),
      { once: true },
    );
  }

  @computed
  get resultQuery() {
    return this.remoteTerm && this.remoteTerm === this.filter.trim()
      ? this.searchQuery
      : this.query;
  }

  @computed
  get pages() {
    const filter = this.filter.trim().toLowerCase();
    const iid = numberFrom(filter);
    const seen = new Set<string>();
    const pages = this.query.data?.pages ?? [];
    const matching = (items: InboxRequest[]) =>
      items.flatMap((request) => {
        const key = `${request.project_id}!${request.iid}`;
        if (seen.has(key)) return [];
        const projectPath =
          request.references?.full?.replace(/!\d+$/, '') ||
          this.projectPath?.(request.project_id) ||
          `#${request.project_id}`;
        const match =
          !filter ||
          (iid
            ? String(request.iid) === iid
            : request.title.toLowerCase().includes(filter) ||
              projectPath.toLowerCase().includes(filter));
        if (!match) return [];
        seen.add(key);
        return [{ ...request, projectPath }];
      });

    const result = pages.map(({ page, items }) => ({
      page,
      items: matching(items),
    }));
    if (this.resultQuery === this.searchQuery) {
      result.push(
        ...(this.searchQuery.data?.pages ?? []).map(({ page, items }) => ({
          page: -page,
          items: matching(items),
        })),
      );
    }
    return result;
  }

  @computed
  get hasRequests() {
    return this.pages.some((page) => page.items.length > 0);
  }

  @computed
  get isLoading() {
    return (
      this.resultQuery.isLoading ||
      (Boolean(this.filter.trim()) && this.filter.trim() !== this.remoteTerm) ||
      (this.scope === 'reviewer' && this.userQuery.isLoading)
    );
  }

  @computed
  get error() {
    return (
      this.resultQuery.error ||
      (this.scope === 'reviewer' && this.userQuery.error)
    );
  }

  @actionBound
  setFilter(filter: string) {
    clearTimeout(this.searchTimer);
    this.filter = filter;
    if (!filter.trim()) this.remoteTerm = '';
    else this.searchTimer = setTimeout(() => this.applyFilter(filter), 230);
  }

  @actionBound
  private applyFilter(filter: string) {
    this.remoteTerm = filter.trim();
  }

  @actionBound
  setScope(scope: InboxScope) {
    this.scope = scope;
  }

  @actionBound
  loadMore() {
    const query = this.resultQuery;
    if (query.hasNextPage && !query.isFetching) void query.fetchNextPage();
  }

  @actionBound
  retry() {
    const query = this.resultQuery;
    if (this.scope === 'reviewer' && this.userQuery.error) {
      void this.userQuery.refetch();
    } else if (query.isFetchNextPageError) {
      this.loadMore();
    } else {
      void query.refetch();
    }
  }

  @actionBound
  openRequest(request: InboxRow) {
    const connectionId = this.globals.stores.settings.activeId;
    if (!connectionId) return;

    this.globals.navigation.mergeRequests.open(
      connectionId,
      { id: request.project_id, path_with_namespace: request.projectPath },
      request.iid,
      request.title,
    );
  }
}
