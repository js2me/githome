import { actionBound, computed, observable, runInAction } from 'mobx';
import { queryClient } from 'mobx-tanstack-query/preset';
import type { GithubReviewThread } from '@/shared/api/github/workspace/review-state';
import { forgeKey } from '@/shared/lib/forge/keys';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { createScopedQuery } from '@/shared/lib/query/create-scoped-query';
import type { GithubReviewModel } from './review';

class ReviewStateScope {
  constructor(readonly review: GithubReviewModel) {}
}

type Scope = NonNullable<GithubReviewStateModel['scope']>;
const resourceKey = ({ session, resource, id }: Scope, ...parts: string[]) =>
  forgeKey(
    session,
    'repositories',
    resource.repositoryId,
    'pull-requests',
    resource.number,
    id,
    ...parts,
  );
const filesKey = (scope: Scope) =>
  resourceKey(scope, 'viewed-files', scope.revision.base, scope.revision.head);
const threadsKey = (scope: Scope) => resourceKey(scope, 'review-threads');

export class GithubReviewStateModel extends ReviewStateScope {
  @observable accessor savingFile: string | null = null;
  @observable accessor savingThread: string | null = null;
  @observable accessor error: string | null = null;

  @computed get scope() {
    const { scope, revision } = this.review;
    const id = this.review.parent.pullRequest.data?.nodeId;
    return scope && id && revision ? { ...scope, id, revision } : null;
  }

  readonly viewedFiles = createScopedQuery({
    scope: () => this.scope,
    disabledKey: ['github-viewed', null],
    abortSignal: this.review.parent.unmountSignal,
    queryKey: filesKey,
    queryFn: ({ id, github }, signal) => github.listViewedFiles(id, signal),
    queryOptions: { retry: false },
  });

  readonly threads = createScopedQuery({
    scope: () => this.scope,
    disabledKey: ['github-threads', null],
    abortSignal: this.review.parent.unmountSignal,
    queryKey: threadsKey,
    queryFn: ({ id, github }, signal) => github.listReviewThreads(id, signal),
    queryOptions: { retry: false },
  });

  @computed get threadsByComment() {
    const map = new Map<string, GithubReviewThread>();
    for (const thread of this.threads.data ?? []) {
      const root = thread.comments.nodes[0]?.databaseId;
      if (root != null) map.set(String(root), thread);
    }
    return map;
  }

  @computed get viewed() {
    return new Set(this.viewedFiles.data ?? []);
  }

  @actionBound clearError() {
    this.error = null;
  }

  @actionBound async markViewed(
    path: string,
    viewed: boolean,
    onSaved: () => void,
  ) {
    const scope = this.scope;
    const signal = this.review.parent.unmountSignal;
    if (!scope || !this.viewedFiles.data || this.savingFile) return;
    const { showChanges } = this.review;
    this.clearError();
    this.savingFile = path;
    try {
      await scope.github.setFileViewed(scope.id, path, viewed, signal);
      if (signal.aborted) return;
      const key = filesKey(scope);
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      if (this.scope === scope && this.review.showChanges === showChanges)
        onSaved();
      queryClient.setQueryData<string[]>(key, (files) =>
        viewed
          ? [...new Set([...(files ?? []), path])]
          : files?.filter((file) => file !== path),
      );
    } catch (error) {
      if (this.scope === scope)
        runInAction(() => {
          this.error =
            error instanceof Error
              ? error.message
              : new LocalizedError('review.couldNotSaveTheViewedStatus')
                  .message;
        });
    } finally {
      runInAction(() => (this.savingFile = null));
    }
  }

  @actionBound async resolve(id: string, resolved: boolean) {
    const scope = this.scope;
    const thread = this.threadsByComment.get(id);
    const signal = this.review.parent.unmountSignal;
    if (
      !scope ||
      !thread ||
      this.savingThread ||
      !(resolved ? thread.viewerCanResolve : thread.viewerCanUnresolve)
    )
      return;
    this.clearError();
    this.savingThread = id;
    try {
      const result = await scope.github.setThreadResolved(
        thread.id,
        resolved,
        signal,
      );
      if (signal.aborted) return;
      const key = threadsKey(scope);
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      queryClient.setQueryData<GithubReviewThread[]>(key, (threads) =>
        threads?.map((item) =>
          item.id === thread.id ? { ...item, ...result } : item,
        ),
      );
    } catch (error) {
      if (this.scope === scope)
        runInAction(() => {
          this.error =
            error instanceof Error
              ? error.message
              : new LocalizedError('forge.reviewStateUnavailable').message;
        });
    } finally {
      runInAction(() => (this.savingThread = null));
    }
  }
}
