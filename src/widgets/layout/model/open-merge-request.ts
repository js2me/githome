import { actionBound, observable, runInAction } from 'mobx';
import { createRef } from 'yummies/mobx';
import { resolveMergeRequestLink } from '@/features/merge-requests';
import { WorkspaceVM } from '@/features/workspace-navigation';
import { gitlabApi } from '@/shared/api/gitlab';
import { GitLabApiError } from '@/shared/api/gitlab/client';

export class OpenMergeRequestVM extends WorkspaceVM {
  readonly dialog = createRef<HTMLDialogElement>();
  readonly input = createRef<HTMLInputElement>();
  private request?: AbortController;
  @observable accessor link = '';
  @observable accessor error = '';
  @observable accessor pending = false;

  protected willMount() {
    document.addEventListener(
      'keydown',
      (event) => {
        if (
          !(event.ctrlKey || event.metaKey) ||
          event.code !== 'KeyK' ||
          event.altKey ||
          event.shiftKey ||
          event.repeat ||
          event.defaultPrevented ||
          event.isComposing
        )
          return;
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.closest('input, textarea, select'))
        )
          return;
        if (document.querySelector('dialog[open]')) return;
        event.preventDefault();
        this.open();
      },
      { signal: this.unmountSignal },
    );
  }

  @actionBound
  open() {
    this.reset();
    this.dialog.current?.showModal();
    this.input.current?.focus();
  }

  @actionBound
  setLink(link: string) {
    this.link = link;
    this.error = '';
  }

  @actionBound
  reset() {
    this.request?.abort();
    this.request = undefined;
    this.pending = false;
    this.setLink('');
  }

  protected didUnmount() {
    this.request?.abort();
  }

  @actionBound
  async submit() {
    if (this.pending || !this.link.trim()) return;
    const request = new AbortController();
    this.request = request;
    this.pending = true;
    this.error = '';

    try {
      const { settings } = this.globals.stores;
      const { connection, projectPath, iid } = resolveMergeRequestLink(
        this.link,
        settings.connections,
        settings.activeId,
      );
      const mr = await gitlabApi.getMergeRequestDetail(
        connection,
        projectPath,
        iid,
        request.signal,
      );
      if (request.signal.aborted || !this.dialog.current?.open) return;
      if (!mr.project_id || mr.iid !== iid) {
        throw new Error('GitLab вернул неполные данные мерж-реквеста.');
      }
      this.dialog.current?.close();
      this.globals.navigation.mergeRequests.open(
        connection.id,
        { id: mr.project_id, path_with_namespace: projectPath },
        iid,
        mr.title,
      );
    } catch (error) {
      if (request.signal.aborted) return;
      runInAction(() => {
        if (error instanceof GitLabApiError) {
          this.error = `Не удалось открыть MR (HTTP ${error.status}). Проверьте ссылку и доступ к проекту.`;
        } else if (error instanceof TypeError) {
          this.error = 'Не удалось связаться с GitLab. Проверьте подключение.';
        } else {
          this.error =
            error instanceof Error ? error.message : 'Не удалось открыть MR.';
        }
      });
    } finally {
      if (!request.signal.aborted)
        runInAction(() => {
          this.pending = false;
        });
    }
  }
}
