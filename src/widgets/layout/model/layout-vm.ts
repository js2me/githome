import { action, actionBound, computed, observable } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import { createRef } from 'yummies/mobx';
import type { Workspace } from '@/features/workspace-navigation';
import { WorkspaceVM } from '@/features/workspace-navigation';
import {
  type CloudCredentials,
  type ForgeConnection,
  parseCloudCredentials,
} from '@/shared/api/forge/connection';
import type { ForgeProvider } from '@/shared/api/forge/contracts';
import type { GitLabProjectDC } from '@/shared/api/gitlab';
import {
  normalizeJiraBaseUrl,
  parseConnectionDraft,
} from '@/shared/lib/gitlab/connection/connection';
import { t } from '@/shared/lib/i18n';
import { AppSettings } from './app-settings';
import { RefreshShortcut } from './refresh-shortcut';

export class LayoutVM extends WorkspaceVM {
  readonly appSettings: AppSettings;
  readonly refreshShortcut = new RefreshShortcut();
  readonly connectionDialog = createRef<HTMLDialogElement>();
  readonly connectionUrlInput = createRef<HTMLInputElement>();

  @observable accessor isConnectionDialogOpen = false;
  @observable accessor draftConnectionId: string | null = null;
  @observable accessor draftGitlabUrl = '';
  @observable accessor draftGitToken = '';
  @observable accessor draftJiraUrl = '';
  @observable accessor draftProvider: ForgeProvider = 'gitlab';
  @observable accessor draftBitbucketEmail = '';
  @observable accessor draftBitbucketWorkspace = '';
  @observable accessor forgeHomeRevision = 0;

  @computed
  get cloudSession() {
    const session = this.globals.stores.settings.activeSession;
    return session?.gitlabConnection ? null : session;
  }

  @computed
  get cloudDraft(): CloudCredentials | null {
    switch (this.draftProvider) {
      case 'github':
        return { provider: 'github', gitToken: this.draftGitToken };
      case 'bitbucket':
        return {
          provider: 'bitbucket',
          gitToken: this.draftGitToken,
          email: this.draftBitbucketEmail,
          workspace: this.draftBitbucketWorkspace,
        };
      default:
        return null;
    }
  }

  constructor(globals: Workspace, params: ViewModelParams) {
    super(globals, params);

    this.appSettings = new AppSettings(globals);
  }

  willMount() {
    void this.appSettings.updates.connect(this.unmountSignal);
    this.appSettings.connectSystemLinks(this.unmountSignal);
    this.refreshShortcut.connect(window, this.unmountSignal);
  }

  @computed
  get canSubmitConnection() {
    if (this.cloudDraft) return Boolean(parseCloudCredentials(this.cloudDraft));
    return Boolean(
      parseConnectionDraft(
        this.draftGitlabUrl,
        this.draftGitToken,
        this.draftJiraUrl,
      ),
    );
  }

  @computed
  get isDraftJiraUrlInvalid() {
    return Boolean(
      this.draftJiraUrl.trim() && !normalizeJiraBaseUrl(this.draftJiraUrl),
    );
  }

  @computed
  get projectId(): number | null {
    const {
      analytics,
      files,
      mergeRequest,
      mergeRequests,
      pipelines,
      repository,
    } = this.globals.routes;

    const projectId =
      mergeRequest.params?.projectId ??
      mergeRequests.params?.projectId ??
      analytics.params?.projectId ??
      pipelines.params?.projectId ??
      files.params?.projectId ??
      repository.params?.projectId;

    if (!projectId) {
      return null;
    }

    const id = Number(projectId);
    return Number.isNaN(id) ? null : id;
  }

  @computed
  get repository(): GitLabProjectDC | null {
    const cachedProject = this.globals.stores.repository.project;
    const projectId = this.projectId;

    if (cachedProject && projectId !== null && cachedProject.id === projectId) {
      return cachedProject;
    }

    return null;
  }

  @computed
  get mergeRequestIid(): number | null {
    const mergeRequestIid =
      this.globals.routes.mergeRequest.params?.mergeRequestIid;

    if (!mergeRequestIid) {
      return null;
    }

    const iid = Number(mergeRequestIid);
    return Number.isNaN(iid) ? null : iid;
  }

  @computed
  get isMergeRequestDetailOpen() {
    return this.globals.routes.mergeRequest.isOpened;
  }

  @computed
  get currentSection() {
    const { routes } = this.globals;
    if (routes.mergeRequests.isOpened || this.isMergeRequestDetailOpen) {
      return { label: t('common.mergeRequests'), open: this.openMergeRequests };
    }
    if (routes.files.isOpened)
      return { label: t('common.files'), open: this.openFiles };
    if (routes.pipelines.isOpened)
      return { label: t('pipelines.pipelines'), open: this.openPipelines };
    if (routes.analytics.isOpened)
      return { label: t('analytics.analytics'), open: this.openAnalytics };
    return null;
  }

  @computed
  get showMergeRequestBreadcrumb() {
    return this.isMergeRequestDetailOpen && this.mergeRequestIid !== null;
  }

  @computed
  get repositoryBreadcrumb() {
    if (!this.showRepositoryBreadcrumbs) {
      return null;
    }

    return this.repository;
  }

  @computed
  get showRepositoryBreadcrumbs() {
    return (
      (this.globals.routes.repository.isOpened ||
        this.globals.routes.repository.hasOpenedChildren) &&
      this.repository !== null &&
      this.projectId !== null
    );
  }

  @computed
  get projectIdParam() {
    return this.projectId !== null ? String(this.projectId) : '';
  }

  @action
  setDraftGitlabUrl(value: string) {
    this.draftGitlabUrl = value;
  }

  @action
  setDraftGitToken(value: string) {
    this.draftGitToken = value;
  }

  @action
  setDraftJiraUrl(value: string) {
    this.draftJiraUrl = value;
  }

  @action
  setDraftProvider(provider: ForgeProvider) {
    if (this.draftConnectionId || this.draftProvider === provider) return;
    this.draftProvider = provider;
    this.draftGitToken = '';
  }

  @action
  setDraftBitbucketEmail(email: string) {
    this.draftBitbucketEmail = email;
  }

  @action
  setDraftBitbucketWorkspace(workspace: string) {
    this.draftBitbucketWorkspace = workspace;
  }

  @actionBound
  openConnectionPopup() {
    const dialog = this.connectionDialog.current;
    if (!dialog) return;
    this.setConnectionDraft(this.globals.stores.settings.activeForgeItem);
    dialog.showModal();
    this.isConnectionDialogOpen = true;
    if (!this.draftConnectionId) this.connectionUrlInput.current?.focus();
  }

  @actionBound
  onConnectionDialogClosed() {
    this.isConnectionDialogOpen = Boolean(this.connectionDialog.current?.open);
  }

  @actionBound
  closeConnectionPopup() {
    this.connectionDialog.current?.close();
  }

  @actionBound
  selectConnection(id: string) {
    const settings = this.globals.stores.settings;
    settings.setActiveConnection(id);
    this.setConnectionDraft(settings.activeForgeItem);
  }

  @actionBound
  selectNewConnection() {
    this.setConnectionDraft(null);
    this.connectionUrlInput.current?.focus();
  }

  @actionBound
  saveConnection() {
    if (!this.canSubmitConnection) return;
    const settings = this.globals.stores.settings;
    const saved = this.cloudDraft
      ? settings.saveCloudConnection(
          this.cloudDraft,
          this.draftConnectionId ?? undefined,
        )
      : this.draftConnectionId
        ? settings.updateConnection(
            this.draftConnectionId,
            this.draftGitlabUrl,
            this.draftGitToken,
            this.draftJiraUrl,
          )
        : settings.addConnection(
            this.draftGitlabUrl,
            this.draftGitToken,
            this.draftJiraUrl,
          );
    if (saved) this.closeConnectionPopup();
  }

  @actionBound
  removeConnection() {
    if (!this.draftConnectionId) return;
    const settings = this.globals.stores.settings;
    settings.removeConnection(this.draftConnectionId);
    this.setConnectionDraft(settings.activeForgeItem);
  }

  @action
  private setConnectionDraft(item: ForgeConnection | null) {
    this.draftConnectionId = item?.id ?? null;
    this.draftProvider = item?.provider ?? 'gitlab';
    this.draftGitlabUrl = item?.gitlabUrl ?? '';
    this.draftGitToken = item?.gitToken ?? '';
    this.draftJiraUrl = item?.jiraUrl ?? '';
    this.draftBitbucketEmail = item?.email ?? '';
    this.draftBitbucketWorkspace = item?.workspace ?? '';
  }

  @actionBound
  openHome() {
    if (this.cloudSession) {
      this.forgeHomeRevision++;
      return;
    }
    void this.globals.routes.home.open();
  }

  @actionBound
  openRepository() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.routes.repository.open({ projectId });
  }

  @actionBound
  openFiles() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.routes.files.open({ projectId });
  }

  @actionBound
  openMergeRequests() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.routes.mergeRequests.open({ projectId });
  }

  @actionBound
  openPipelines() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.routes.pipelines.open({ projectId });
  }

  @actionBound
  openAnalytics() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.routes.analytics.open({ projectId });
  }
}
