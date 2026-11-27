import { actionBound, observable, runInAction } from 'mobx';
import { queryClient } from 'mobx-tanstack-query/preset';
import { createRef } from 'yummies/mobx';
import { mergeRequestDetailKey } from '@/entities/gitlab-merge-requests';
import { resolveMergeRequestLink } from '@/features/merge-requests';
import { WorkspaceVM } from '@/features/workspace-navigation';
import { gitlabApi } from '@/shared/api/gitlab';
import { GitLabApiError } from '@/shared/api/gitlab/client';
import { parsePipelineLocation } from '@/shared/lib/gitlab/links/pipeline';
import { parseProjectLocation } from '@/shared/lib/gitlab/links/project';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { resolveProjectTarget } from './open-project';

const linkCopy = {
  pipeline: {
    title: 'navigation.openAPipeline',
    label: 'navigation.gitlabPipelineLink',
  },
  project: {
    title: 'navigation.openAProject',
    label: 'navigation.gitlabProjectLink',
  },
  mr: {
    title: 'navigation.openAMergeRequest',
    label: 'navigation.gitlabMergeRequestLink',
  },
} as const;

export class OpenMergeRequestVM extends WorkspaceVM {
  readonly dialog = createRef<HTMLDialogElement>();
  readonly input = createRef<HTMLInputElement>();
  private request?: AbortController;
  @observable accessor link = '';
  @observable private accessor currentError: Error | null = null;

  get copy() {
    if (parsePipelineLocation(this.link)) return linkCopy.pipeline;
    if (parseProjectLocation(this.link)) return linkCopy.project;
    return linkCopy.mr;
  }

  get error() {
    return this.currentError?.message ?? '';
  }
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
          event.isComposing ||
          !this.globals.stores.settings.connections.length
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

  protected didMount() {
    const desktop = window.githomeDesktop?.systemLinks;
    if (!desktop) return;

    const signal = this.unmountSignal;
    let draining = Promise.resolve();
    const receive = () => {
      draining = draining
        .then(async () => {
          if (signal.aborted) return;
          const links = await desktop.takePending();
          for (const link of links) {
            if (signal.aborted) return;
            this.open();
            this.setLink(link);
            await this.submit();
          }
        })
        .catch(() => undefined);
    };
    const unsubscribe = desktop.subscribe(receive);
    signal.addEventListener('abort', unsubscribe, { once: true });
    receive();
  }

  @actionBound
  open() {
    this.reset();
    const dialog = this.dialog.current;
    if (dialog && !dialog.open) dialog.showModal();
    this.input.current?.focus();
  }

  @actionBound
  setLink(link: string) {
    this.link = link;
    this.currentError = null;
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
    this.currentError = null;

    const pipeline = parsePipelineLocation(this.link);
    const project = pipeline ?? parseProjectLocation(this.link);
    try {
      const { settings } = this.globals.stores;
      if (project) {
        const target = await resolveProjectTarget(
          this.globals,
          project,
          request.signal,
        );
        if (request.signal.aborted || !this.dialog.current?.open) return;
        this.dialog.current.close();
        if (settings.activeId !== target.connection.id) {
          settings.setActiveConnection(target.connection.id);
        }
        this.globals.stores.repository.setProject(target.project);
        const params = { projectId: String(target.project.id) };
        if (pipeline) {
          await this.globals.routes.pipelines.open(params, {
            query: { pipeline: String(pipeline.id) },
          });
        } else {
          await this.globals.routes.repository.open(params);
        }
        return;
      }
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
        throw new LocalizedError(
          'navigation.gitlabReturnedIncompleteMergeRequestData',
        );
      }
      queryClient.setQueryData(
        mergeRequestDetailKey(connection, mr.project_id, iid),
        mr,
      );
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
        if (
          project &&
          (error instanceof GitLabApiError || error instanceof TypeError)
        ) {
          this.currentError = new LocalizedError(
            pipeline
              ? 'pipelines.couldNotLoadThePipeline'
              : 'repository.couldNotLoadTheRepository',
          );
        } else if (error instanceof GitLabApiError) {
          this.currentError = new LocalizedError(
            'navigation.couldNotOpenTheMergeRequestHttp',
            { v1: error.status },
          );
        } else if (error instanceof TypeError) {
          this.currentError = new LocalizedError(
            'navigation.couldNotReachGitlabCheckYourConnection',
          );
        } else {
          this.currentError =
            error instanceof Error
              ? error
              : new LocalizedError('navigation.couldNotOpenTheMergeRequest');
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
