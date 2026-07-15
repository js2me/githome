import { action, computed, observable, reaction } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import type { GitLabProjectDC } from "@/shared/api/gitlab";
import { isConnectionDraftValid } from "@/shared/lib/gitlab/connection";
import { VM } from "@/shared/lib/view-models/vm";
import { AppSettings } from "./app-settings";

export class LayoutVM extends VM {
  readonly appSettings: AppSettings;

  @observable accessor draftGitlabUrl = "";
  @observable accessor draftGitToken = "";
  @observable accessor isConnectionPopupOpen = false;
  @observable accessor isSettingsPopupOpen = false;

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);

    this.appSettings = new AppSettings(globals);

    reaction(
      () => this.globals.stores.settings.activeItem,
      (item) => {
        this.draftGitlabUrl = item?.gitlabUrl ?? "";
        this.draftGitToken = item?.gitToken ?? "";
      },
      { fireImmediately: true },
    );
  }

  @computed
  get canAdd() {
    return isConnectionDraftValid(this.draftGitlabUrl, this.draftGitToken);
  }

  @computed
  get canSave() {
    return Boolean(this.globals.stores.settings.activeId) && this.canAdd;
  }

  @computed
  get canRemove() {
    return Boolean(this.globals.stores.settings.activeId);
  }

  @computed
  get projectId(): number | null {
    const { files, mergeRequest, mergeRequests, repository } = this.globals.routes;

    const projectId =
      mergeRequest.params?.projectId ??
      mergeRequests.params?.projectId ??
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
  get isFilesOpen() {
    return this.globals.routes.files.isOpened;
  }

  @computed
  get isFilesNavActive() {
    return this.isFilesOpen;
  }

  @computed
  get isMergeRequestsOpen() {
    return (
      this.globals.routes.mergeRequests.isOpened ||
      this.isMergeRequestDetailOpen
    );
  }

  @computed
  get isMergeRequestsNavActive() {
    return this.isMergeRequestsOpen && !this.isMergeRequestDetailOpen;
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

  @action
  openConnectionPopup() {
    this.isConnectionPopupOpen = true;
  }

  @action
  closeConnectionPopup() {
    this.isConnectionPopupOpen = false;
  }

  @action.bound
  toggleConnectionPopup() {
    this.isConnectionPopupOpen = !this.isConnectionPopupOpen;
  }

  @action
  openSettingsPopup() {
    this.isSettingsPopupOpen = true;
  }

  @action
  closeSettingsPopup() {
    this.isSettingsPopupOpen = false;
  }

  @action.bound
  toggleSettingsPopup() {
    this.isSettingsPopupOpen = !this.isSettingsPopupOpen;
  }

  @action.bound
  selectConnection(id: string) {
    if (!id) {
      this.globals.stores.settings.setActiveConnection(null);
      return;
    }

    this.globals.stores.settings.setActiveConnection(id);
  }

  @action.bound
  selectNewConnection() {
    this.selectConnection("");
  }

  @action.bound
  addConnection() {
    if (!this.canAdd) {
      return;
    }

    this.globals.stores.settings.addConnection(
      this.draftGitlabUrl,
      this.draftGitToken,
    );
  }

  @action.bound
  saveConnection() {
    const activeId = this.globals.stores.settings.activeId;

    if (!activeId || !this.canSave) {
      return;
    }

    this.globals.stores.settings.updateConnection(
      activeId,
      this.draftGitlabUrl,
      this.draftGitToken,
    );
  }

  @action.bound
  removeConnection() {
    const activeId = this.globals.stores.settings.activeId;

    if (!activeId) {
      return;
    }

    this.globals.stores.settings.removeConnection(activeId);
  }

  @action
  clearDraft() {
    this.draftGitlabUrl = "";
    this.draftGitToken = "";
  }

  @action.bound
  openHome() {
    void this.globals.routes.home.open();
  }

  @action.bound
  openRepository() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.routes.repository.open({ projectId });
  }

  @action.bound
  openFiles() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.routes.files.open({ projectId });
  }

  @action.bound
  openMergeRequests() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.routes.mergeRequests.open({ projectId });
  }
}
