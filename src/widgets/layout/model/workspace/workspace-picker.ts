import { actionBound, computed, observable, reaction } from 'mobx';
import { createRef } from 'yummies/mobx';
import {
  buildWorkspaceTree,
  isMergeRequestNavItem,
  WorkspaceVM,
} from '@/features/workspace-navigation';
import { createWorkspaceReviewQuery } from './review-query';

export class WorkspacePickerVM extends WorkspaceVM {
  readonly workspace = createRef<HTMLElement>();
  readonly trigger = createRef<HTMLButtonElement>();
  @observable accessor expanded = false;
  readonly collapsed = observable.set<string>();
  private readonly reviews = createWorkspaceReviewQuery(
    this.globals,
    this.unmountSignal,
    () => (this.expanded ? this.items : []),
  );

  @computed
  get items() {
    return this.globals.stores.navTree.items.filter(isMergeRequestNavItem);
  }

  @computed
  get branches() {
    return buildWorkspaceTree(this.globals.stores.navTree);
  }

  reviewFor(itemId: string) {
    return this.reviews.data?.[itemId];
  }

  @actionBound
  toggleBranch(id: string) {
    if (!this.collapsed.delete(id)) this.collapsed.add(id);
  }

  willMount() {
    reaction(
      () => this.items.length,
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
