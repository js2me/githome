import { actionBound, computed, observable, runInAction } from 'mobx';
import type { ReviewInbox } from '@/features/review-inbox';
import type { Workspace } from '@/features/workspace-navigation';
import { resolveGitlabQuickLink } from '@/shared/lib/gitlab/links/gitlab-url';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { openGitLabLink } from '@/widgets/layout';

export class InboxCommandModel {
  @observable accessor value = '';
  @observable accessor busy = false;
  @observable accessor error: Error | null = null;
  private request?: AbortController;

  constructor(
    private readonly workspace: Workspace,
    private readonly inbox: ReviewInbox,
    signal: AbortSignal,
  ) {
    signal.addEventListener('abort', () => this.request?.abort(), {
      once: true,
    });
  }

  @computed
  private get link() {
    return resolveGitlabQuickLink(
      this.value,
      this.workspace.stores.settings.activeConnection?.gitlabUrl,
    );
  }

  @computed
  private get firstMatch() {
    return this.inbox.pages.find(({ items }) => items.length)?.items[0];
  }

  @computed
  get canSubmit() {
    return (
      !this.busy && Boolean(this.value.trim() && (this.link || this.firstMatch))
    );
  }

  @actionBound
  setValue(value: string) {
    this.value = value;
    this.error = null;
    this.inbox.setFilter(this.link ? '' : value);
  }

  @actionBound
  async submit() {
    if (!this.canSubmit) return;
    this.error = null;
    if (!this.link) {
      if (this.firstMatch) this.inbox.openRequest(this.firstMatch);
      return;
    }
    const controller = new AbortController();
    this.request = controller;
    this.busy = true;
    try {
      await openGitLabLink(this.workspace, this.link, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted)
        runInAction(() => {
          this.error =
            error instanceof Error
              ? error
              : new LocalizedError('navigation.couldNotOpenTheMergeRequest');
        });
    } finally {
      if (!controller.signal.aborted)
        runInAction(() => {
          this.busy = false;
        });
    }
  }
}
