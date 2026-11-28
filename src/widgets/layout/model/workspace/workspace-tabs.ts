import { actionBound, computed } from 'mobx';
import { createRef } from 'yummies/mobx';
import {
  isMergeRequestNavItem,
  type MergeRequestNavItem,
  WorkspaceVM,
} from '@/features/workspace-navigation';

export class WorkspaceTabsVM extends WorkspaceVM {
  readonly homeTab = createRef<HTMLButtonElement>();
  readonly activeTab = createRef<HTMLButtonElement>({
    onChange: (button) => {
      const scroller = button?.closest('.workbench-tab-scroll');
      const tab = button?.parentElement;
      if (!tab || !scroller) return;
      const item = tab.getBoundingClientRect();
      const viewport = scroller.getBoundingClientRect();
      if (item.left < viewport.left)
        scroller.scrollLeft += item.left - viewport.left;
      if (item.right > viewport.right)
        scroller.scrollLeft += item.right - viewport.right;
    },
  });
  private focusFrame = 0;

  @computed
  get items() {
    return this.globals.stores.navTree.items.filter(isMergeRequestNavItem);
  }

  @actionBound
  openHome() {
    void this.globals.routes.home.open();
  }

  @actionBound
  close(item: MergeRequestNavItem, target: HTMLElement) {
    this.globals.navigation.mergeRequests.close(item);
    if (
      !target.contains(document.activeElement) &&
      document.activeElement !== document.body
    )
      return;
    cancelAnimationFrame(this.focusFrame);
    this.focusFrame = requestAnimationFrame(() => {
      (this.activeTab.current ?? this.homeTab.current)?.focus({
        preventScroll: true,
      });
    });
  }

  didUnmount() {
    cancelAnimationFrame(this.focusFrame);
  }
}
