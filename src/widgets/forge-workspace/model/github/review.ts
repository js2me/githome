import { actionBound, computed, observable, runInAction } from 'mobx';
import { queryClient } from 'mobx-tanstack-query/preset';
import type { ForgePage } from '@/shared/api/forge/contracts';
import type {
  GithubReview,
  GithubReviewComment,
  GithubReviewEvent,
} from '@/shared/api/github/workspace/review';
import { githubDiffDiscussions } from '@/shared/api/github/workspace/review';
import { ActiveDiffFile } from '@/shared/lib/diff/navigation/active-diff-file';
import { forgeKey } from '@/shared/lib/forge/keys';
import {
  createForgeAccountQuery,
  createForgeList,
} from '@/shared/lib/forge/queries';
import type { CreateDiffCommentInput } from '@/shared/lib/gitlab/discussions/diff-comment';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { createScopedQuery } from '@/shared/lib/query/create-scoped-query';
import { GithubReviewStateModel } from './review-state';
import { GithubWorkspacePart } from './workspace-part';

type ReviewScope = NonNullable<GithubReviewModel['scope']>;
const keyFor = ({ session, resource }: ReviewScope, kind: string) =>
  forgeKey(
    session,
    'repositories',
    resource.repositoryId,
    'pull-requests',
    resource.number,
    kind,
  );

const emptyChanges: NonNullable<
  GithubReviewModel['changes']['data']
>['pages'][number]['items'] = [];

async function readAll<T>(
  load: (cursor: string | undefined) => Promise<ForgePage<T>>,
) {
  const items: T[] = [];
  const cursors = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await load(cursor);
    items.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor || cursors.has(cursor)) break;
    cursors.add(cursor);
  } while (cursor);
  return items;
}

export class GithubReviewModel extends GithubWorkspacePart {
  readonly state = new GithubReviewStateModel(this);
  readonly fileNavigation = new ActiveDiffFile();

  @observable accessor pending:
    | 'inline'
    | 'review'
    | { replyTo: string }
    | null = null;
  @observable accessor inlineError: string | null = null;
  @observable accessor replyError: { id: string; message: string } | null =
    null;
  @observable accessor reviewError: string | null = null;
  @observable accessor reviewDraft = '';

  @computed get scope() {
    const scope = this.parent.scope;
    const github = scope?.session.github;
    return scope && github ? { ...scope, github } : null;
  }

  @computed get showChanges() {
    return Boolean(
      this.scope && this.parent.globals.query.data.view === 'changes',
    );
  }

  @computed get revision() {
    return this.parent.pullRequest.data?.revision;
  }

  @computed get canComment() {
    return Boolean(
      this.scope &&
        this.revision &&
        this.parent.pullRequest.data?.state === 'open',
    );
  }

  readonly changes = createForgeList(
    this.parent.unmountSignal,
    () =>
      this.scope && this.revision
        ? { ...this.scope, revision: this.revision }
        : null,
    (scope) => [
      ...keyFor(scope, 'files'),
      scope.revision.base,
      scope.revision.head,
    ],
    ({ github, resource }, cursor, signal) =>
      github.listChanges(resource, cursor, signal),
  );

  readonly inline = this.query('inline', ({ github, resource }, signal) =>
    readAll((cursor) => github.listReviewComments(resource, cursor, signal)),
  );

  readonly reviews = this.query('reviews', ({ github, resource }, signal) =>
    readAll((cursor) => github.listReviews(resource, cursor, signal)),
  );

  readonly account = createForgeAccountQuery(
    () => this.scope?.session ?? null,
    this.parent.unmountSignal,
  );

  @computed get isOwnPullRequest() {
    const username = this.account.data?.username;
    return Boolean(
      username && username === this.parent.pullRequest.data?.author?.username,
    );
  }

  @computed get files() {
    return (
      this.changes.data?.pages.flatMap(({ items }) => items) ?? emptyChanges
    );
  }

  @computed get discussions() {
    return githubDiffDiscussions(this.inline.data ?? []).map((discussion) => {
      const thread = this.state.threadsByComment.get(discussion.id);
      if (!thread) return discussion;
      const canToggle = thread.isResolved
        ? thread.viewerCanUnresolve
        : thread.viewerCanResolve;
      return {
        ...discussion,
        notes: discussion.notes.map((note, index) =>
          index === 0
            ? {
                ...note,
                resolved: thread.isResolved,
                resolvable: thread.isResolved || canToggle,
                can_toggle_resolution: canToggle,
              }
            : note,
        ),
      };
    });
  }

  @computed get reviewHistory() {
    return (
      this.reviews.data?.filter(
        ({ state, body }) =>
          state !== 'PENDING' &&
          (state !== 'COMMENTED' || Boolean(body?.trim())),
      ) ?? []
    );
  }

  private query<T>(
    kind: string,
    queryFn: (scope: ReviewScope, signal: AbortSignal) => Promise<T>,
  ) {
    return createScopedQuery({
      scope: () => (this.scope && this.revision ? this.scope : null),
      disabledKey: ['github-review', null],
      abortSignal: this.parent.unmountSignal,
      queryKey: (scope) => keyFor(scope, kind),
      queryFn,
      queryOptions: { retry: false },
    });
  }

  private async loadRevisionFile(
    path: string,
    ref: string,
    signal: AbortSignal,
  ) {
    const { scope, revision } = this;
    if (!scope || !revision)
      throw new LocalizedError('forge.previewUnavailable');
    const {
      github,
      resource: { repositoryId },
    } = scope;
    const isBase = ref === 'base';
    const sha = isBase
      ? await queryClient.fetchQuery({
          queryKey: [
            ...keyFor(scope, 'merge-base'),
            revision.base,
            revision.head,
          ],
          queryFn: ({ signal: querySignal }) =>
            github.getMergeBase(
              repositoryId,
              revision.base,
              revision.head,
              AbortSignal.any([this.parent.unmountSignal, querySignal]),
            ),
          staleTime: Infinity,
          retry: false,
        })
      : revision.head;
    signal.throwIfAborted();
    return github.getCommitFile(
      isBase ? repositoryId : (revision.headRepository ?? repositoryId),
      path,
      sha,
      signal,
    );
  }

  loadFileContent = async (path: string, ref: string) => {
    const { text } = await this.loadRevisionFile(
      path,
      ref,
      this.parent.unmountSignal,
    );
    if (text == null) throw new LocalizedError('forge.previewUnavailable');
    return text;
  };

  loadFileImage = async (path: string, ref: string, signal: AbortSignal) => {
    const combined = AbortSignal.any([this.parent.unmountSignal, signal]);
    const { image } = await this.loadRevisionFile(path, ref, combined);
    if (!image) throw new LocalizedError('forge.previewUnavailable');
    return (await fetch(image, { signal: combined })).blob();
  };

  @actionBound setView(showChanges: boolean) {
    this.parent.globals.query.update({ view: showChanges ? 'changes' : null });
  }

  @actionBound reset() {
    this.state.clearError();
    this.clearInlineError();
    this.clearReplyError();
    this.reviewError = null;
    this.reviewDraft = '';
  }

  @actionBound clearInlineError() {
    this.inlineError = null;
  }

  @actionBound clearReplyError() {
    this.replyError = null;
  }

  @actionBound setReviewDraft(value: string) {
    this.reviewDraft = value;
    this.reviewError = null;
  }

  @actionBound async addComment(input: CreateDiffCommentInput) {
    const { scope, revision, canComment } = this;
    if (!scope || !revision || !canComment || this.pending) return false;
    this.clearInlineError();
    this.pending = 'inline';
    try {
      const comment = await scope.github.addReviewComment(
        scope.resource,
        revision.head,
        input,
        this.parent.unmountSignal,
      );
      this.store(scope, 'inline', comment);
      if (this.scope === scope && this.state.scope)
        void this.state.threads.refetch();
      return true;
    } catch (error) {
      if (this.scope === scope)
        runInAction(() => (this.inlineError = message(error)));
      return false;
    } finally {
      runInAction(() => (this.pending = null));
    }
  }

  @actionBound async reply(id: string, body: string) {
    const { scope } = this;
    if (!scope || !body.trim() || this.pending) return false;
    this.clearReplyError();
    this.pending = { replyTo: id };
    try {
      const comment = await scope.github.replyToReviewComment(
        scope.resource,
        id,
        body,
        this.parent.unmountSignal,
      );
      this.store(scope, 'inline', comment);
      return true;
    } catch (error) {
      if (this.scope === scope)
        runInAction(() => (this.replyError = { id, message: message(error) }));
      return false;
    } finally {
      runInAction(() => (this.pending = null));
    }
  }

  @actionBound async submitReview(event: GithubReviewEvent) {
    const { scope, revision, canComment, reviewDraft } = this;
    if (
      !scope ||
      !revision ||
      !canComment ||
      this.pending ||
      (this.isOwnPullRequest && event !== 'COMMENT')
    )
      return;
    if (event !== 'APPROVE' && !reviewDraft.trim()) {
      this.reviewError = new LocalizedError('review.enterAComment').message;
      return;
    }
    this.reviewError = null;
    this.pending = 'review';
    try {
      const review = await scope.github.submitReview(
        scope.resource,
        revision.head,
        event,
        reviewDraft,
        this.parent.unmountSignal,
      );
      this.store(scope, 'reviews', review);
      if (this.scope === scope) this.setReviewDraft('');
    } catch (error) {
      if (this.scope === scope)
        runInAction(() => (this.reviewError = message(error)));
    } finally {
      runInAction(() => (this.pending = null));
    }
  }

  private store<T extends GithubReviewComment | GithubReview>(
    scope: ReviewScope,
    kind: 'inline' | 'reviews',
    value: T,
  ) {
    if (this.parent.unmountSignal.aborted) return;
    const key = keyFor(scope, kind);
    void queryClient.cancelQueries({ queryKey: key, exact: true });
    queryClient.setQueryData<T[]>(key, (items) => [
      ...(items ?? []).filter(({ id }) => id !== value.id),
      value,
    ]);
    // Refresh later without dropping the newly posted record if GitHub's read has not caught up yet.
    void queryClient.invalidateQueries({
      queryKey: key,
      exact: true,
      refetchType: 'none',
    });
  }
}

const message = (error: unknown) =>
  (error instanceof Error ? error : new LocalizedError('forge.reviewFailed'))
    .message;
