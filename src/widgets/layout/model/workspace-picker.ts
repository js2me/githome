import { actionBound, computed, observable, reaction } from 'mobx';
import { createRef } from 'yummies/mobx';
import { WorkspaceVM } from '@/features/workspace-navigation';

export class WorkspacePickerVM extends WorkspaceVM {
  readonly workspace = createRef<HTMLElement>();
  readonly trigger = createRef<HTMLButtonElement>();
  @observable accessor expanded = false;

  @computed
  get groups() {
    const store = this.globals.stores.navTree;
    return store.groups
      .map((group) => ({
        ...group,
        items: store.items.filter((item) => item.groupId === group.id),
      }))
      .filter((group) => group.items.length > 0);
  }

  willMount() {
    reaction(
      () => this.globals.stores.navTree.items.length,
      (count) => {
        if (!count) this.setExpanded(false);
      },
      { signal: this.unmountSignal },
    );
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (
          this.expanded &&
          !this.workspace.current?.contains(event.target as Node)
        ) {
          this.setExpanded(false);
        }
      },
      { signal: this.unmountSignal },
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (!this.expanded || event.key !== 'Escape' || event.defaultPrevented)
          return;
        if (this.workspace.current?.contains(document.activeElement)) {
          event.preventDefault();
          this.closeAndFocusTrigger();
        } else {
          this.setExpanded(false);
        }
      },
      { signal: this.unmountSignal },
    );
  }

  @actionBound
  setExpanded(expanded: boolean) {
    this.expanded = expanded;
  }

  @actionBound
  closeAndFocusTrigger() {
    this.setExpanded(false);
    this.trigger.current?.focus({ preventScroll: true });
  }
}
