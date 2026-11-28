import { actionBound, observable, runInAction } from 'mobx';
import type {
  MergeRequestReactionName,
  MergeRequestReactionTarget,
} from '@/shared/api/gitlab/endpoints/merge-requests/reactions/award-emoji';
import {
  invalidateMergeRequestReactions,
  toggleMergeRequestReaction,
} from '@/shared/api/gitlab/mutations/reactions';
import {
  createMergeRequestReactionsQuery,
  reactionKey,
} from '@/shared/api/gitlab/queries/merge-requests/reactions';
import type { Globals } from '@/shared/model/globals';

type Options = {
  globals: Globals;
  abortSignal: AbortSignal;
  target: () => MergeRequestReactionTarget | false;
  currentUserId: () => number | null;
};

export class MergeRequestReactions {
  readonly query;
  private readonly saving = observable.set<string>();
  @observable private accessor failedScope: string | null = null;

  constructor(private readonly options: Options) {
    this.query = createMergeRequestReactionsQuery({
      globals: options.globals,
      abortSignal: options.abortSignal,
      params: options.target,
    });
  }

  private get context() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const target = this.options.target();
    if (!connection || !target) return null;
    const key = reactionKey(connection, target);
    return { connection, target, key, scope: JSON.stringify(key) };
  }

  get canReact() {
    const context = this.context;
    return Boolean(
      context &&
        this.query.data &&
        this.options.currentUserId() != null &&
        !this.saving.has(context.scope),
    );
  }

  get saveFailed() {
    return this.failedScope != null && this.failedScope === this.context?.scope;
  }

  getReaction(name: MergeRequestReactionName) {
    const awards = this.query.data?.filter((award) => award.name === name);
    const userId = this.options.currentUserId();
    return {
      count: awards?.length,
      selected: awards?.some(({ user }) => user.id === userId) ?? false,
    };
  }

  @actionBound
  async toggle(name: MergeRequestReactionName) {
    const context = this.context;
    const userId = this.options.currentUserId();
    const { abortSignal } = this.options;
    if (!context || !this.canReact || userId == null || abortSignal.aborted)
      return;

    const { connection, target, scope } = context;
    const existing = this.query.data?.find(
      (award) => award.name === name && award.user.id === userId,
    );
    this.saving.add(scope);
    this.failedScope = null;

    try {
      await toggleMergeRequestReaction(
        connection,
        target,
        name,
        existing?.id,
        abortSignal,
      );
    } catch {
      if (!abortSignal.aborted && this.context?.scope === scope) {
        runInAction(() => {
          this.failedScope = scope;
        });
        await invalidateMergeRequestReactions(connection, target);
      }
    } finally {
      runInAction(() => {
        this.saving.delete(scope);
      });
    }
  }
}
