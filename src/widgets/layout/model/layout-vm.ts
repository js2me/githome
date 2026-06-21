import { action, computed, observable, reaction } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { RepositoryPageVM } from "@/pages/repository/model";
import type { GitLabProjectDC } from "@/shared/api/gitlab";
import { isConnectionDraftValid } from "@/shared/lib/gitlab/connection";
import { VM } from "@/shared/lib/view-models/vm";

export class LayoutVM extends VM {
  @observable accessor draftGitlabUrl = "";
  @observable accessor draftGitToken = "";
  @observable accessor isConnectionPopupOpen = false;

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);

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
    return RepositoryPageVM.resolveProjectId(this.globals);
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
    return RepositoryPageVM.resolveMergeRequestIid(this.globals);
  }

  @computed
  get isMergeRequestDetailOpen() {
    return this.globals.router.routes.mergeRequest.isOpened;
  }

  @computed
  get isMergeRequestsOpen() {
    return (
      this.globals.router.routes.mergeRequests.isOpened ||
      this.isMergeRequestDetailOpen
    );
  }

  @computed
  get isRepositoryOverviewOpen() {
    return this.globals.router.routes.repository.isOpened;
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
  get isRepositorySidebarVisible() {
    return this.projectId !== null && !this.isMergeRequestDetailOpen;
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
      (this.globals.router.routes.repositoryRoot.isOpened ||
        this.globals.router.routes.repositoryRoot.hasOpenedChildren) && 
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
  openRepository() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.router.routes.repository.open({ projectId });
  }

  @action.bound
  openMergeRequests() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.router.routes.mergeRequests.open({ projectId });
  }
}
