import { actionBound, type IObservableValue, observable, reaction } from 'mobx';
import {
  getChangesTreeFileDataId,
  getDiffFileElementId,
} from '@/shared/lib/diff-search';
import { VM } from '@/shared/lib/view-models/vm';

const buildConnectorPath = (x1: number, y1: number, cardRect: DOMRect) => {
  const x2 = cardRect.left;

  if (y1 >= cardRect.top && y1 <= cardRect.bottom) {
    return `M ${x1} ${y1} H ${x2}`;
  }

  const endY = y1 < cardRect.top ? cardRect.top : cardRect.bottom;
  const midX = x1 + (x2 - x1) / 2;

  return `M ${x1} ${y1} H ${midX} V ${endY} H ${x2}`;
};

const getConnectorPath = (
  nav: HTMLElement,
  diffCard: HTMLElement,
  treeFileId: string,
) => {
  const treeItem = nav.querySelector(`[data-changes-file-id="${treeFileId}"]`);
  if (!treeItem) return null;

  const treeRect = treeItem.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();
  const rowCenter = treeRect.top + treeRect.height / 2;
  if (
    !treeRect.height ||
    rowCenter < Math.max(navRect.top, 0) ||
    rowCenter > Math.min(navRect.bottom, window.innerHeight)
  ) {
    return null;
  }

  const cardRect = diffCard.getBoundingClientRect();
  if (
    !cardRect.height ||
    cardRect.bottom < 0 ||
    cardRect.top > window.innerHeight
  ) {
    return null;
  }

  return buildConnectorPath(treeRect.right, rowCenter, cardRect);
};

export class ChangesActiveFileLinkVM extends VM<{
  activeFile: IObservableValue<string | null>;
}> {
  @observable accessor path: string | null = null;
  private detach?: () => void;

  willMount() {
    reaction(
      () => this.payload.activeFile.get(),
      (key) => this.attach(key),
      { fireImmediately: true, signal: this.unmountSignal },
    );
  }

  @actionBound
  private setPath(path: string | null) {
    this.path = path;
  }

  didUnmount() {
    this.detach?.();
  }

  private attach(activeFileKey: string | null) {
    this.detach?.();
    this.detach = undefined;
    if (!activeFileKey) {
      this.setPath(null);
      return;
    }

    let rafId: number | null = null;
    let cancelled = false;
    let teardown: (() => void) | null = null;

    const treeFileId = getChangesTreeFileDataId(activeFileKey);

    const attach = () => {
      if (cancelled) return;

      const diffCard = document.getElementById(
        getDiffFileElementId(activeFileKey),
      );
      const nav = document.querySelector<HTMLElement>(
        '.changes-file-tree__nav',
      );

      if (!diffCard || !nav) {
        rafId = requestAnimationFrame(attach);
        return;
      }

      const update = () => {
        rafId = null;
        if (!cancelled)
          this.setPath(getConnectorPath(nav, diffCard, treeFileId));
      };
      const scheduleUpdate = () => {
        rafId ??= requestAnimationFrame(update);
      };

      update();
      window.addEventListener('scroll', scheduleUpdate, { passive: true });
      window.addEventListener('resize', scheduleUpdate, { passive: true });
      nav.addEventListener('scroll', scheduleUpdate, { passive: true });

      const resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(diffCard);
      resizeObserver.observe(nav);
      const rowObserver = new MutationObserver(scheduleUpdate);
      rowObserver.observe(nav, { childList: true, subtree: true });

      teardown = () => {
        resizeObserver.disconnect();
        rowObserver.disconnect();
        window.removeEventListener('scroll', scheduleUpdate);
        window.removeEventListener('resize', scheduleUpdate);
        nav.removeEventListener('scroll', scheduleUpdate);
      };
    };

    attach();

    this.detach = () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      teardown?.();
    };
  }
}
