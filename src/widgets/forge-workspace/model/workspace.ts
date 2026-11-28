import { actionBound, computed, observable, observableRef } from 'mobx';
import type { ForgeSession } from '@/shared/api/forge/adapter';
import type { ForgeRepository } from '@/shared/api/forge/contracts';
import { createForgeCommentMutation } from '@/shared/lib/forge/mutations';
import {
  createForgeCommentList,
  createForgePullRequestList,
  createForgePullRequestQuery,
  createForgeRepositoryList,
} from '@/shared/lib/forge/queries';
import { VM } from '@/shared/lib/view-models/vm';

export class ForgeWorkspaceVM extends VM<{ session: ForgeSession }> {
  @observableRef accessor repository: ForgeRepository | null = null;
  @observable accessor number: number | null = null;
  @observable accessor draft = '';

  readonly repositories = createForgeRepositoryList(
    () => this.payload.session,
    this.unmountSignal,
  );
  readonly pullRequests = createForgePullRequestList(
    () =>
      this.repository
        ? { session: this.payload.session, resource: this.repository.id }
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
  readonly createComment = createForgeCommentMutation(this.unmountSignal);

  @computed
  get scope() {
    if (!this.repository || this.number === null) return null;
    return {
      session: this.payload.session,
      resource: { repositoryId: this.repository.id, number: this.number },
    };
  }

  @actionBound
  openRepository(repository: ForgeRepository) {
    this.repository = repository;
  }

  @actionBound
  openPullRequest(number: number) {
    this.createComment.reset();
    this.number = number;
    this.draft = '';
  }

  @actionBound
  goBack() {
    if (this.createComment.isPending) return;
    if (this.number !== null) this.number = null;
    else this.repository = null;
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
      if (result.isSuccess && !this.unmountSignal.aborted) this.setDraft('');
    } catch {
      // The mutation exposes the request error to the comment form.
    }
  }
}
