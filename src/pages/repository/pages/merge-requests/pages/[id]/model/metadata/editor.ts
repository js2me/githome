import { actionBound, computed, observable, reaction, runInAction } from 'mobx';
import type {
  GitLabMergeRequestDC,
  GitLabProjectLabelDC,
  GitLabUserDC,
} from '@/shared/api/gitlab';
import { gitlabApi } from '@/shared/api/gitlab';
import { createConnectionProfileQuery } from '@/shared/api/gitlab/queries/connection-profile-query';
import {
  createLabelCandidatesQuery,
  createMergeRequestApprovalStateQuery,
  createMergeRequestMetadataQuery,
  createReviewerCandidatesQuery,
} from '@/shared/api/gitlab/queries/merge-requests/metadata';
import { t } from '@/shared/lib/i18n';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import type { Globals } from '@/shared/model/globals';

export interface LabelOption {
  id?: string;
  name: string;
  color?: string;
  description?: string | null;
  archived?: boolean;
}

export const asLabelOption = (label: GitLabProjectLabelDC): LabelOption => ({
  ...label,
  id: `gid://gitlab/Label/${label.id}`,
});

type Field = 'reviewers' | 'labels';

interface EditorOptions {
  globals: Globals;
  abortSignal: AbortSignal;
  target: () => {
    projectId: number;
    projectPath: string;
    mr: GitLabMergeRequestDC;
  } | null;
  refresh: () => Promise<unknown>;
}

export class MrMetadataEditor {
  readonly metadata;
  readonly reviewerCandidates;
  readonly approvalState;
  readonly labelCandidates;
  readonly profile;
  @observable accessor field: Field | null = null;
  @observable accessor search = '';
  @observable accessor ruleId = '';
  @observable private accessor remoteSearch = '';
  @observable accessor busy = false;
  @observable private accessor actionError: Error | null = null;
  @observable private accessor rereviewRecipient: string | null = null;
  @observable accessor creatingLabel = false;
  @observable accessor labelName = '';
  @observable accessor labelDescription = '';
  @observable accessor labelColor = '#428bca';
  private dialog?: HTMLDialogElement;
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly options: EditorOptions) {
    const { globals, abortSignal, target } = options;
    this.metadata = createMergeRequestMetadataQuery({
      globals,
      abortSignal,
      params: () => {
        const current = target();
        return (
          current && { projectPath: current.projectPath, iid: current.mr.iid }
        );
      },
    });

    const pickerParams = (field: Field) => {
      const current = target();
      return (
        this.field === field &&
        current && {
          projectId: current.projectId,
          search: this.remoteSearch || undefined,
        }
      );
    };
    this.approvalState = createMergeRequestApprovalStateQuery({
      globals,
      abortSignal,
      params: () => {
        const current = target();
        return (
          this.field === 'reviewers' &&
          current && {
            projectId: current.projectId,
            iid: current.mr.iid,
          }
        );
      },
      queryOptions: { retry: false, staleTime: 15_000 },
    });
    this.reviewerCandidates = createReviewerCandidatesQuery({
      globals,
      abortSignal,
      queryOptions: { retry: false },
      params: () => !this.selectedRule && pickerParams('reviewers'),
    });
    this.labelCandidates = createLabelCandidatesQuery({
      globals,
      abortSignal,
      queryOptions: { retry: false },
      params: () => pickerParams('labels'),
    });
    this.profile = createConnectionProfileQuery(
      () =>
        this.field === 'reviewers'
          ? globals.stores.settings.activeConnection
          : null,
      abortSignal,
    );
    reaction(() => this.scope, this.close, { signal: abortSignal });
    abortSignal.addEventListener(
      'abort',
      () => clearTimeout(this.searchTimer),
      { once: true },
    );
  }

  private get scope() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const target = this.options.target();
    return connection && target
      ? `${connection.id}/${connection.credentialsRevision}/${target.projectId}/${target.mr.iid}`
      : null;
  }

  get errorMessage() {
    return this.actionError?.message;
  }

  get canUpdate() {
    return (
      !!this.scope &&
      !this.metadata.isPending &&
      this.metadata.data?.canUpdate !== false
    );
  }

  get canCreateLabel() {
    return this.canUpdate && this.metadata.data?.canCreateLabel !== false;
  }

  get rereviewNotice() {
    return (
      this.rereviewRecipient &&
      t('mrMetadata.rereviewSent', { name: this.rereviewRecipient })
    );
  }

  @computed
  get reviewers() {
    return this.options.target()?.mr.reviewers ?? [];
  }

  @computed
  get labels(): LabelOption[] {
    const names = this.options.target()?.mr.labels ?? [];
    const metadata = new Map(
      this.metadata.data?.labels.map((label) => [
        label.title,
        { ...label, name: label.title },
      ]),
    );
    return names.map((name) => metadata.get(name) ?? { name });
  }

  @computed
  get approvalRules() {
    return (this.approvalState.data?.rules ?? []).filter(
      (rule) => rule.approvals_required > 0 && rule.eligible_approvers?.length,
    );
  }

  @computed
  get selectedRule() {
    return this.approvalRules.find((rule) => String(rule.id) === this.ruleId);
  }

  @actionBound
  selectRule(id: string) {
    this.ruleId = id;
  }

  @computed
  get usersToShow() {
    const query = this.remoteSearch.toLocaleLowerCase();
    const matches = (user: GitLabUserDC) =>
      `${user.name} ${user.username}`.toLocaleLowerCase().includes(query);
    if (this.selectedRule) {
      return (this.selectedRule.eligible_approvers ?? []).filter(matches);
    }
    const selected = this.reviewers.filter(matches);
    return [
      ...new Map(
        [
          ...selected,
          ...(this.reviewerCandidates.data?.pages.flatMap(
            (page) => page.items,
          ) ?? []),
        ].map((user) => [user.id, user]),
      ).values(),
    ];
  }

  @computed
  get labelsToShow() {
    const query = this.remoteSearch.toLocaleLowerCase();
    const selected = this.labels.filter((label) =>
      `${label.name} ${label.description ?? ''}`
        .toLocaleLowerCase()
        .includes(query),
    );
    const available = (
      this.labelCandidates.data?.pages.flatMap((page) => page.items) ?? []
    )
      .filter((label) => !label.archived)
      .map(asLabelOption);
    // The MR returns names for selected labels. Preserve those IDs over any
    // same-name catalog entries that are shadowed by a project label.
    return [
      ...new Map(
        [
          ...available,
          ...selected.map((label) =>
            label.id
              ? label
              : (available.find((item) => item.name === label.name) ?? label),
          ),
        ].map((label) => [label.name, label]),
      ).values(),
    ].sort(
      (a, b) => Number(this.hasLabel(b.name)) - Number(this.hasLabel(a.name)),
    );
  }

  hasReviewer(id: number) {
    return this.reviewers.some((user) => user.id === id);
  }

  hasLabel(name: string) {
    return this.labels.some((label) => label.name === name);
  }

  attachDialog = (element: HTMLDialogElement | null) => {
    this.dialog = element ?? undefined;
    if (element && !element.open) {
      element.showModal();
      element.querySelector<HTMLInputElement>('input[type=search]')?.focus();
    }
  };

  @actionBound
  open(field: Field) {
    if (!this.canUpdate || this.busy) return;
    this.close();
    this.field = field;
  }

  @actionBound
  close() {
    if (this.dialog?.open) this.dialog.close();
    clearTimeout(this.searchTimer);
    this.field = null;
    this.ruleId = '';
    this.search = '';
    this.remoteSearch = '';
    this.creatingLabel = false;
    this.actionError = null;
    this.rereviewRecipient = null;
  }

  @actionBound
  setSearch(value: string) {
    this.search = value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(
      () =>
        runInAction(() => {
          const term = value.trim();
          this.remoteSearch =
            this.field === 'reviewers' ? term.replace(/^@/, '') : term;
        }),
      220,
    );
  }

  @actionBound
  startLabel() {
    this.labelName = this.search.trim();
    this.labelColor = '#428bca';
    this.labelDescription = '';
    this.actionError = null;
    this.rereviewRecipient = null;
    this.creatingLabel = true;
  }

  @actionBound
  cancelLabel() {
    this.creatingLabel = false;
    this.actionError = null;
    this.rereviewRecipient = null;
  }

  @actionBound
  updateLabelDraft(field: 'name' | 'description' | 'color', value: string) {
    if (field === 'name') this.labelName = value;
    else if (field === 'description') this.labelDescription = value;
    else this.labelColor = value;
  }

  private async mutate(
    operation: (
      connection: NonNullable<
        Globals['stores']['settings']['activeConnection']
      >,
      target: { projectId: number; projectPath: string; iid: number },
      signal: AbortSignal,
    ) => Promise<unknown>,
  ) {
    const { globals, target, abortSignal } = this.options;
    const current = target();
    const connection = globals.stores.settings.activeConnection;
    const scope = this.scope;
    if (!current || !connection || !scope || this.busy || !this.canUpdate)
      return false;

    this.busy = true;
    this.actionError = null;
    this.rereviewRecipient = null;
    try {
      await operation(
        connection,
        { ...current, iid: current.mr.iid },
        abortSignal,
      );
      if (scope !== this.scope || abortSignal.aborted) return false;
      await Promise.all([
        this.options.refresh(),
        this.metadata.refetch(),
        this.field === 'reviewers' && this.approvalState.refetch(),
      ]);
      return scope === this.scope && !abortSignal.aborted;
    } catch (error) {
      if (scope === this.scope && !abortSignal.aborted)
        runInAction(() => {
          this.actionError =
            error instanceof Error
              ? error
              : new LocalizedError('common.couldNotCompleteTheAction');
        });
      return false;
    } finally {
      runInAction(() => {
        this.busy = false;
      });
    }
  }

  @actionBound
  toggleReviewer(user: GitLabUserDC) {
    const selected = !this.hasReviewer(user.id);
    return this.mutate((connection, target, signal) =>
      gitlabApi.changeMergeRequestReviewer(
        connection,
        target,
        user.username,
        selected,
        signal,
      ),
    );
  }

  @actionBound
  async rereview(user: GitLabUserDC) {
    if (!this.hasReviewer(user.id)) return;
    const saved = await this.mutate((connection, target, signal) =>
      gitlabApi.requestMergeRequestRereview(
        connection,
        target,
        user.id,
        signal,
      ),
    );
    if (saved && this.field === 'reviewers')
      runInAction(() => {
        this.rereviewRecipient = user.name;
      });
  }

  @actionBound
  toggleLabel(label: LabelOption) {
    const selected = !this.hasLabel(label.name);
    return this.mutate((connection, target, signal) =>
      gitlabApi.changeMergeRequestLabel(
        connection,
        target,
        label,
        selected,
        signal,
      ),
    );
  }

  @actionBound
  async saveLabel() {
    const name = this.labelName.trim();
    if (
      !this.canCreateLabel ||
      !name ||
      !/^#[0-9a-f]{6}$/i.test(this.labelColor)
    )
      return;
    const label = {
      name,
      color: this.labelColor,
      description: this.labelDescription.trim(),
    };
    const scope = this.scope;
    const saved = await this.mutate(async (connection, target, signal) => {
      const created = await gitlabApi.createProjectLabel(
        connection,
        target.projectId,
        label,
        signal,
      );
      try {
        await gitlabApi.changeMergeRequestLabel(
          connection,
          target,
          asLabelOption(created),
          true,
          signal,
        );
      } catch (error) {
        if (scope === this.scope) this.cancelLabel();
        throw new LocalizedError('mrMetadata.labelCreatedNotAttached', {
          name: created.name,
          error: error instanceof Error ? error.message : '',
        });
      } finally {
        if (scope === this.scope && this.field === 'labels' && !signal.aborted)
          void this.labelCandidates.invalidate();
      }
    });
    if (saved) this.cancelLabel();
  }
}
