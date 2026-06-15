import { action, computed, makeObservable, observable, reaction } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { isConnectionDraftValid } from "@/shared/lib/gitlab-connection";
import { VM } from "@/shared/lib/view-models/vm";

export class LayoutVM extends VM {
  draftGitlabUrl = "";
  draftGitToken = "";

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);

    makeObservable(this, {
      draftGitlabUrl: observable,
      draftGitToken: observable,
      canAdd: computed,
      canSave: computed,
      canRemove: computed,
      setDraftGitlabUrl: action,
      setDraftGitToken: action,
      selectConnection: action,
      addConnection: action,
      saveConnection: action,
      removeConnection: action,
      clearDraft: action,
    });

    reaction(
      () => this.globals.stores.settings.activeItem,
      (item) => {
        this.draftGitlabUrl = item?.gitlabUrl ?? "";
        this.draftGitToken = item?.gitToken ?? "";
      },
      { fireImmediately: true },
    );
  }

  get canAdd() {
    return isConnectionDraftValid(this.draftGitlabUrl, this.draftGitToken);
  }

  get canSave() {
    return Boolean(this.globals.stores.settings.activeId) && this.canAdd;
  }

  get canRemove() {
    return Boolean(this.globals.stores.settings.activeId);
  }

  setDraftGitlabUrl(value: string) {
    this.draftGitlabUrl = value;
  }

  setDraftGitToken(value: string) {
    this.draftGitToken = value;
  }

  selectConnection(id: string) {
    if (!id) {
      this.globals.stores.settings.setActiveConnection(null);
      return;
    }

    this.globals.stores.settings.setActiveConnection(id);
  }

  addConnection() {
    if (!this.canAdd) {
      return;
    }

    this.globals.stores.settings.addConnection(
      this.draftGitlabUrl,
      this.draftGitToken,
    );
  }

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

  removeConnection() {
    const activeId = this.globals.stores.settings.activeId;

    if (!activeId) {
      return;
    }

    this.globals.stores.settings.removeConnection(activeId);
  }

  clearDraft() {
    this.draftGitlabUrl = "";
    this.draftGitToken = "";
  }
}
