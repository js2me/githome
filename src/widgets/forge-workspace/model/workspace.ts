import { actionBound, computed, observable, reaction } from 'mobx';
import { WorkspaceVM } from '@/features/workspace-navigation';
import type { ForgeSession } from '@/shared/api/forge/adapter';
import type { ForgeRepository } from '@/shared/api/forge/contracts';
import { createForgeCommentMutation } from '@/shared/lib/forge/mutations';
import {
  createForgeCommentList,
  createForgePostedCommentsQuery,
  createForgePullRequestList,
  createForgePullRequestQuery,
  createForgeRepositoryList,
} from '@/shared/lib/forge/queries';
import { GithubRepositoryModel } from './github/repository';
import { GithubReviewModel } from './github/review';

export class ForgeWorkspaceVM extends WorkspaceVM<{ session: ForgeSession }> {
  @observable accessor draft = '';

  readonly repositories = createForgeRepositoryList(
    () => this.payload.session,
    this.unmountSignal,
  );
  readonly pullRequests = createForgePullRequestList(
    () =>
      this.repository && !this.payload.session.github && this.number === null
        ? { session: this.payload.session, resource: this.repository }
        : null,
    this.unmountSignal,
  );
  readonly pullRequest = createForgePullRequestQuery(
    () => this.scope,
    this.unmountSignal,
  );
  readonly comments = createForgeCommentList(
    () => this.scope,
    this.unmountSignal,
  );
  readonly postedComments = createForgePostedCommentsQuery(
    () => this.scope,
    this.unmountSignal,
  );
  readonly createComment = createForgeCommentMutation(this.unmountSignal);
  readonly githubRepository = new GithubRepositoryModel(this);
  readonly githubReview = new GithubReviewModel(this);

  @computed
  get routeParams() {
    const { forgeRepository, forgePullRequest } = this.globals.routes;
    const params = forgePullRequest.params ?? forgeRepository.params;
    return params?.connectionId === this.payload.session.id ? params : null;
  }

  @computed
  get repository() {
    const params = this.routeParams;
    return params ? `${params.owner}/${params.repo}` : null;
  }

  @computed
  get number() {
    const params = this.globals.routes.forgePullRequest.params;
    if (!this.routeParams || !params || !/^[1-9]\d*$/.test(params.number))
      return null;
    const number = Number(params.number);
    return Number.isSafeInteger(number) ? number : null;
  }

  @computed
  get visibleComments() {
    const serverComments = this.comments.data?.pages.flatMap(
      (page) => page.items,
    );
    const posted = this.postedComments.data;
    if (!serverComments && !posted) return undefined;
    const byId = new Map(
      serverComments?.map((comment) => [comment.id, comment]),
    );
    for (const comment of posted ?? []) {
      if (!byId.has(comment.id)) byId.set(comment.id, comment);
    }
    return [...byId.values()];
  }

  willMount() {
    const { githubReview } = this;
    reaction(
      () => [githubReview.files, githubReview.showChanges] as const,
      ([files]) => githubReview.fileNavigation.track(files),
      { signal: this.unmountSignal },
    );
    reaction(
      () => this.scope,
      () => {
        this.setDraft('');
        this.createComment.reset();
        this.githubReview.reset();
      },
      { signal: this.unmountSignal },
    );
  }

  willUnmount() {
    this.githubReview.fileNavigation.dispose();
  }

  @computed
  get scope() {
    if (!this.repository || this.number === null) return null;
    return {
      session: this.payload.session,
      resource: { repositoryId: this.repository, number: this.number },
    };
  }

  @actionBound
  openRepository(repository: ForgeRepository) {
    const [owner, repo] = repository.id.split('/');
    if (!owner || !repo) return;
    void this.globals.routes.forgeRepository.open({
      connectionId: this.payload.session.id,
      owner,
      repo,
    });
  }

  @actionBound
  openPullRequest(number: number) {
    if (!this.routeParams) return;
    const { connectionId, owner, repo } = this.routeParams;
    void this.globals.routes.forgePullRequest.open({
      connectionId,
      owner,
      repo,
      number: String(number),
    });
  }

  @actionBound
  goBack() {
    if (this.createComment.isPending) return;
    if (this.number !== null && this.routeParams) {
      const { connectionId, owner, repo } = this.routeParams;
      void this.globals.routes.forgeRepository.open({
        connectionId,
        owner,
        repo,
      });
    } else {
      void this.globals.routes.home.open();
    }
  }

  @actionBound
  setDraft(draft: string) {
    this.draft = draft;
  }

  @actionBound
  async submitComment() {
    const scope = this.scope;
    if (!scope || this.createComment.isPending || !this.draft.trim()) return;
    try {
      const result = await this.createComment.mutate({
        session: scope.session,
        ref: scope.resource,
        body: this.draft,
      });
      if (
        result.isSuccess &&
        !this.unmountSignal.aborted &&
        this.scope === scope
      ) {
        this.setDraft('');
      }
    } catch {
      // The mutation exposes the request error to the comment form.
    }
  }
}
