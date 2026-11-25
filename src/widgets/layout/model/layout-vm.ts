import { action, actionBound, computed, observable } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import { createRef } from "yummies/mobx";
import type { Globals } from "@/globals";
import type { GitLabProjectDC } from "@/shared/api/gitlab";
import { isConnectionDraftValid } from "@/shared/lib/gitlab/connection";
import type { GitLabConnectionItem } from "@/shared/lib/storage";
import { VM } from "@/shared/lib/view-models/vm";
import { AppSettings } from "./app-settings";

export class LayoutVM extends VM {
  readonly appSettings: AppSettings;
  readonly connectionDialog = createRef<HTMLDialogElement>();
  readonly connectionUrlInput = createRef<HTMLInputElement>();

  @observable accessor draftConnectionId: string | null = null;
  @observable accessor draftGitlabUrl = "";
  @observable accessor draftGitToken = "";

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);

    this.appSettings = new AppSettings(globals);
  }

  willMount() {
    void this.appSettings.updates.connect(this.unmountSignal);
  }

  @computed
  get canSubmitConnection() {
    return isConnectionDraftValid(this.draftGitlabUrl, this.draftGitToken);
  }

  @computed
  get projectId(): number | null {
    const { analytics, files, mergeRequest, mergeRequests, pipelines, repository } = this.globals.routes;

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
      return { label: "Merge requests", open: this.openMergeRequests };
    }
    if (routes.files.isOpened) return { label: "Files", open: this.openFiles };
    if (routes.pipelines.isOpened) return { label: "Pipelines", open: this.openPipelines };
    if (routes.analytics.isOpened) return { label: "Аналитика", open: this.openAnalytics };
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
    return this.projectId !== null ? String(this.projectId) : "";
  }

  @action
  setDraftGitlabUrl(value: string) {
    this.draftGitlabUrl = value;
  }

  @action
  setDraftGitToken(value: string) {
    this.draftGitToken = value;
  }

  @actionBound
  openConnectionPopup() {
    this.setConnectionDraft(this.globals.stores.settings.activeItem);
    this.connectionDialog.current?.showModal();
    if (!this.draftConnectionId) this.connectionUrlInput.current?.focus();
  }

  @actionBound
  closeConnectionPopup() {
    this.connectionDialog.current?.close();
  }

  @actionBound
  selectConnection(id: string) {
    const settings = this.globals.stores.settings;
    settings.setActiveConnection(id);
    this.setConnectionDraft(settings.activeItem);
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
    if (this.draftConnectionId) {
      settings.updateConnection(this.draftConnectionId, this.draftGitlabUrl, this.draftGitToken);
    } else {
      settings.addConnection(this.draftGitlabUrl, this.draftGitToken);
    }
    this.closeConnectionPopup();
  }

  @actionBound
  removeConnection() {
    if (!this.draftConnectionId) return;
    const settings = this.globals.stores.settings;
    settings.removeConnection(this.draftConnectionId);
    this.setConnectionDraft(settings.activeItem);
  }

  @action
  private setConnectionDraft(item: GitLabConnectionItem | null) {
    this.draftConnectionId = item?.id ?? null;
    this.draftGitlabUrl = item?.gitlabUrl ?? "";
    this.draftGitToken = item?.gitToken ?? "";
  }

  @actionBound
  openHome() {
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
