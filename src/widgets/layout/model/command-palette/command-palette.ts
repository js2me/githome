import { actionBound, computed, observable, runInAction } from 'mobx';
import { createRef } from 'yummies/mobx';
import {
  isMergeRequestNavItem,
  WorkspaceVM,
} from '@/features/workspace-navigation';
import { resolveGitlabQuickLink } from '@/shared/lib/gitlab/links/gitlab-url';
import { type MessageKey, t } from '@/shared/lib/i18n';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import type { LayoutVM } from '../layout-vm';
import { openGitLabLink } from '../links/open-gitlab-link';
import {
  CommandPaletteSearch,
  paletteMatches,
  parsePaletteIid,
} from './search';

type OptionKind =
  | 'link'
  | 'project'
  | 'mr'
  | 'home'
  | 'files'
  | 'pipelines'
  | 'analytics';

type Option = {
  id: string;
  kind: OptionKind;
  title: string;
  detail?: string;
  run: () => void;
};

type OptionGroup = {
  title: MessageKey;
  items: Option[];
};

export class CommandPaletteVM extends WorkspaceVM<{}, LayoutVM> {
  readonly dialog = createRef<HTMLDialogElement>();
  readonly input = createRef<HTMLInputElement>();
  private request?: AbortController;
  @observable accessor link = '';
  @observable private accessor currentError: Error | null = null;

  @observable accessor opened = false;
  @observable private accessor activeId = '';
  @observable accessor pending = false;

  readonly search = new CommandPaletteSearch(
    this.globals,
    this.unmountSignal,
    () => (this.opened && !this.gitlabLink ? this.link.trim() : null),
  );

  @computed
  get gitlabLink() {
    return resolveGitlabQuickLink(
      this.link,
      this.globals.stores.settings.activeConnection?.gitlabUrl,
    );
  }

  get error() {
    return this.currentError?.message ?? '';
  }

  @computed
  get groups(): OptionGroup[] {
    if (!this.opened) return [];
    const term = this.link.trim();
    if (this.gitlabLink) {
      return [
        {
          title: 'palette.link',
          items: [
            {
              id: 'link',
              kind: 'link',
              title: t('palette.openLink'),
              detail: term,
              run: () => void this.openLink(),
            },
          ],
        },
      ];
    }

    const { stores, navigation, routes } = this.globals;
    const connectionId = stores.settings.activeId;
    const iid = parsePaletteIid(term);
    const recent: Option[] = stores.navTree.items
      .filter(isMergeRequestNavItem)
      .filter(
        (item) =>
          item.payload?.connectionId === connectionId &&
          (iid
            ? item.payload.mergeRequestIid === Number(iid)
            : !term ||
              paletteMatches(
                term,
                item.title,
                `${item.payload.projectPath}!${item.payload.mergeRequestIid}`,
              )),
      )
      .sort(
        (a, b) => (b.payload.lastOpenedAt ?? 0) - (a.payload.lastOpenedAt ?? 0),
      )
      .map(
        (item): Option => ({
          id: `mr-${item.payload.projectId}-${item.payload.mergeRequestIid}`,
          kind: 'mr',
          title: item.title,
          detail: `${item.payload.projectPath}!${item.payload.mergeRequestIid}`,
          run: () => navigation.mergeRequests.select(item),
        }),
      )
      .slice(0, 5);

    const projects = this.search.projects.map(
      (project): Option => ({
        id: `project-${project.id}`,
        kind: 'project',
        title: project.name,
        detail: project.path_with_namespace,
        run: () => {
          stores.repository.setProject(project);
          void routes.repository.open({ projectId: String(project.id) });
        },
      }),
    );

    const seen = new Set(recent.map(({ id }) => id));
    const requests = connectionId
      ? this.search.mergeRequests.flatMap((request): Option[] => {
          const id = `mr-${request.project_id}-${request.iid}`;
          if (seen.has(id)) return [];
          seen.add(id);
          return [
            {
              id,
              kind: 'mr',
              title: request.title,
              detail: `${request.path}!${request.iid}`,
              run: () =>
                navigation.mergeRequests.open(
                  connectionId,
                  { id: request.project_id, path_with_namespace: request.path },
                  request.iid,
                  request.title,
                ),
            },
          ];
        })
      : [];

    const layout = this.parentViewModel;
    const repo = layout.repositoryBreadcrumb?.path_with_namespace;
    const shortcuts: Option[] = [
      {
        id: 'home',
        kind: 'home',
        title: t('palette.home'),
        run: layout.openHome,
      },
    ];
    if (
      (routes.repository.isOpened || routes.repository.hasOpenedChildren) &&
      layout.projectIdParam
    ) {
      shortcuts.push(
        {
          id: 'overview',
          kind: 'project',
          title: t('workbench.overview'),
          detail: repo,
          run: layout.openRepository,
        },
        {
          id: 'files',
          kind: 'files',
          title: t('common.files'),
          detail: repo,
          run: layout.openFiles,
        },
        {
          id: 'reviews',
          kind: 'mr',
          title: t('common.mergeRequests'),
          detail: repo,
          run: layout.openMergeRequests,
        },
        {
          id: 'pipelines',
          kind: 'pipelines',
          title: t('pipelines.pipelines'),
          detail: repo,
          run: layout.openPipelines,
        },
        {
          id: 'analytics',
          kind: 'analytics',
          title: t('analytics.analytics'),
          detail: repo,
          run: layout.openAnalytics,
        },
      );
    }

    const projectGroup: OptionGroup = {
      title: term ? 'home.projects' : 'home.starred',
      items: projects,
    };
    const recentGroup: OptionGroup = { title: 'palette.recent', items: recent };
    const preferProjects =
      term.includes('/') ||
      Boolean(term && projects[0]?.title.toLowerCase() === term.toLowerCase());
    const groups: OptionGroup[] = [
      {
        title: 'palette.shortcuts',
        items: shortcuts.filter(
          ({ title }) => !term || paletteMatches(term, title),
        ),
      },
      ...(preferProjects
        ? [projectGroup, recentGroup]
        : [recentGroup, projectGroup]),
      { title: 'common.mergeRequests', items: requests },
    ];
    return groups.filter(({ items }) => items.length > 0);
  }

  @computed
  private get options() {
    return this.groups.flatMap(({ items }) => items);
  }

  @computed
  get activeOption() {
    return (
      this.options.find(({ id }) => id === this.activeId) ?? this.options[0]
    );
  }

  @actionBound
  moveSelection(direction: number) {
    if (!this.options.length || this.pending) return;
    const index = this.activeOption
      ? this.options.indexOf(this.activeOption)
      : 0;
    const next =
      (index + direction + this.options.length) % this.options.length;
    this.activeId = this.options[next].id;
    document
      .getElementById(`palette-option-${this.activeId}`)
      ?.scrollIntoView({ block: 'nearest' });
  }

  @actionBound
  activate(option = this.activeOption) {
    if (!option || this.pending) return;
    if (option.kind !== 'link') this.dialog.current?.close();
    option.run();
  }

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
            await this.openLink();
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
    this.opened = !!dialog?.open;
    this.input.current?.focus();
  }

  @actionBound
  setLink(link: string) {
    this.link = link;
    this.currentError = null;
    this.activeId = '';
    this.search.schedule();
  }

  @actionBound
  reset() {
    this.request?.abort();
    this.request = undefined;
    this.pending = false;
    this.opened = !!this.dialog.current?.open;
    this.setLink('');
  }

  protected didUnmount() {
    this.request?.abort();
  }

  @actionBound
  async openLink() {
    const link = this.gitlabLink;
    if (this.pending || !link) return;
    const request = new AbortController();
    this.request = request;
    this.pending = true;
    this.currentError = null;

    try {
      await openGitLabLink(this.globals, link, request.signal, () =>
        this.dialog.current?.close(),
      );
    } catch (error) {
      if (request.signal.aborted) return;
      runInAction(() => {
        this.currentError =
          error instanceof Error
            ? error
            : new LocalizedError('navigation.couldNotOpenTheMergeRequest');
      });
    } finally {
      if (!request.signal.aborted)
        runInAction(() => {
          this.pending = false;
        });
    }
  }
}
