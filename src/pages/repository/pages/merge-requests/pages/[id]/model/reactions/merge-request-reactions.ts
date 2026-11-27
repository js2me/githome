import { actionBound, observable, runInAction } from 'mobx';
import { queryClient } from 'mobx-tanstack-query/preset';
import { mergeRequestDetailKey } from '@/entities/gitlab-merge-requests';
import {
  addMergeRequestAwardEmoji,
  deleteMergeRequestAwardEmoji,
  getMergeRequestAwardEmoji,
  type MergeRequestAwardEmoji,
  type MergeRequestReactionName,
  type MergeRequestReactionTarget,
} from '@/shared/api/gitlab/endpoints/merge-requests/reactions/award-emoji';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/connection/create-query';
import type { Globals } from '@/shared/model/globals';

type Options = {
  globals: Globals;
  abortSignal: AbortSignal;
  target: () => MergeRequestReactionTarget | false;
  currentUserId: () => number | null;
};

const reactionKey = (
  connection: GitLabConnection,
  { projectId, mergeRequestIid }: MergeRequestReactionTarget,
) =>
  [
    ...mergeRequestDetailKey(connection, projectId, mergeRequestIid),
    'reactions',
  ] as const;

export class MergeRequestReactions {
  readonly query;
  private readonly saving = observable.set<string>();
  @observable private accessor failedScope: string | null = null;

  constructor(private readonly options: Options) {
    this.query = createGitlabApiQuery<
      MergeRequestAwardEmoji[],
      MergeRequestReactionTarget
    >({
      globals: options.globals,
      abortSignal: options.abortSignal,
      params: options.target,
      queryKey: ({ connection, ...target }) => reactionKey(connection, target),
      queryFn: ({ connection, signal, ...target }) =>
        getMergeRequestAwardEmoji(connection, target, signal),
      queryOptions: {
        refetchInterval: 20_000,
        refetchOnWindowFocus: true,
        retry: false,
      },
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

    const { connection, target, key, scope } = context;
    const existing = this.query.data?.find(
      (award) => award.name === name && award.user.id === userId,
    );
    this.saving.add(scope);
    this.failedScope = null;

    try {
      const created = existing
        ? await deleteMergeRequestAwardEmoji(
            connection,
            target,
            existing.id,
            abortSignal,
          )
        : await addMergeRequestAwardEmoji(
            connection,
            target,
            name,
            abortSignal,
          );

      // A poll started before the write could otherwise overwrite the new state.
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      queryClient.setQueryData<MergeRequestAwardEmoji[]>(key, (awards) =>
        created
          ? [...(awards ?? []).filter(({ id }) => id !== created.id), created]
          : awards?.filter(({ id }) => id !== existing?.id),
      );
    } catch {
      if (!abortSignal.aborted && this.context?.scope === scope) {
        runInAction(() => {
          this.failedScope = scope;
        });
        await queryClient.invalidateQueries({ queryKey: key, exact: true });
      }
    } finally {
      runInAction(() => {
        this.saving.delete(scope);
      });
    }
  }
}
