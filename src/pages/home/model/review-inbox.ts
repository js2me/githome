import { actionBound, computed, observable } from 'mobx';
import type { Workspace } from '@/features/workspace-navigation';
import type { GitLabMergeRequestDC } from '@/shared/api/gitlab';
import { createInfiniteGitlabQuery } from '@/shared/lib/gitlab/create-query';
import type { GitlabProjectsList } from './gitlab-projects-list';

type InboxScope = 'reviewer' | 'author';

type InboxRequest = GitLabMergeRequestDC & {
  project_id: number;
  references?: { full?: string };
};

export type InboxRow = InboxRequest & { projectPath: string };

export class ReviewInbox {
  @observable accessor scope: InboxScope = 'reviewer';

  readonly query;

  constructor(
    private readonly globals: Workspace,
    abortSignal: AbortSignal,
    private readonly projects: GitlabProjectsList,
  ) {
    this.query = createInfiniteGitlabQuery<InboxRequest>({
      globals,
      abortSignal,
      params: () => {
        const reviewerId = this.projects.currentUserQuery.data;
        if (this.scope === 'reviewer' && !reviewerId) return null;

        return {
          path: '/merge_requests',
          query: {
            state: 'opened',
            order_by: 'updated_at',
            sort: 'desc',
            per_page: 6,
            ...(this.scope === 'reviewer'
              ? { scope: 'all', reviewer_id: reviewerId }
              : { scope: 'created_by_me' }),
          },
        };
      },
      queryOptions: { staleTime: 30_000 },
    });
  }

  @computed
  get pages() {
    return (this.query.data?.pages ?? []).map((page) => ({
      page: page.page,
      items: page.items.map((request) => ({
        ...request,
        projectPath:
          request.references?.full?.replace(/!\d+$/, '') ||
          this.projects.projects.find(
            (project) => project.data.id === request.project_id,
          )?.data.path_with_namespace ||
          `#${request.project_id}`,
      })),
    }));
  }

  @computed
  get hasRequests() {
    return this.pages.some((page) => page.items.length > 0);
  }

  @computed
  get isLoading() {
    return (
      this.query.isLoading ||
      (this.scope === 'reviewer' && this.projects.currentUserQuery.isLoading)
    );
  }

  @computed
  get error() {
    return (
      this.query.error ||
      (this.scope === 'reviewer' && this.projects.currentUserQuery.error)
    );
  }

  @actionBound
  setScope(scope: InboxScope) {
    this.scope = scope;
  }

  @actionBound
  loadMore() {
    if (this.query.hasNextPage && !this.query.isFetching) {
      void this.query.fetchNextPage();
    }
  }

  @actionBound
  retry() {
    if (this.scope === 'reviewer' && this.projects.currentUserQuery.error) {
      void this.projects.currentUserQuery.refetch();
    } else if (this.query.isFetchNextPageError) {
      this.loadMore();
    } else {
      void this.query.refetch();
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
