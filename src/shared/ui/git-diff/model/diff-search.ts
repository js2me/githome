import { actionBound, computed, observable, runInAction } from 'mobx';
import type { ReactNode } from 'react';
import { createRef } from 'yummies/mobx';
import {
  collectDiffSearchMatchesAsync,
  type DiffSearchFileEntry,
  type DiffSearchLineEntry,
  type DiffSearchMatch,
  getDiffFileElementId,
  isDiffFileHeaderRowId,
} from '@/shared/lib/diff-search';
import { registerFindShortcutHandler } from '@/shared/lib/find-shortcut';
import { VM } from '@/shared/lib/view-models/vm';
import { DiffSearchHighlightStore } from './search-highlights';

export type DiffSearchFindBarVisibility = 'toggle' | 'always';

export class DiffSearchVM extends VM<{
  findBarVisibility?: DiffSearchFindBarVisibility;
  children: ReactNode;
}> {
  @observable accessor query = '';
  @observable accessor activeIndex = 0;
  @observable accessor matchCount = 0;
  @observable accessor miniBarActive = false;
  @observable accessor isMainBarInView = true;
  @observable private accessor isOpen = false;

  readonly highlights = new DiffSearchHighlightStore();
  readonly inputRef = createRef<HTMLInputElement>();
  readonly miniInputRef = createRef<HTMLInputElement>();
  readonly mainBarRef = createRef<HTMLDivElement>({
    onChange: (bar) => {
      this.visibilityObserver?.disconnect();
      if (!bar) return;
      this.visibilityObserver = new IntersectionObserver(([entry]) => {
        if (entry) this.setMainBarVisibility(entry.isIntersecting);
      });
      this.visibilityObserver.observe(bar);
    },
  });
  private visibilityObserver?: IntersectionObserver;
  private readonly files = new Map<string, DiffSearchFileEntry>();
  private readonly scrollHandlers = new Map<string, (rowId: string) => void>();
  private matches: DiffSearchMatch[] = [];
  private controller?: AbortController;
  private searchFrame = 0;
  private focusFrame = 0;
  private scrollFrame = 0;
  private pendingFirstMatch = false;

  @computed get showMainBar() {
    return this.payload.findBarVisibility === 'always' || this.isOpen;
  }

  willMount() {
    registerFindShortcutHandler(this.open);
    document.addEventListener('keydown', this.handleKeyDown, {
      capture: true,
      signal: this.unmountSignal,
    });
  }

  didUnmount() {
    registerFindShortcutHandler(null);
    this.controller?.abort();
    cancelAnimationFrame(this.searchFrame);
    cancelAnimationFrame(this.focusFrame);
    cancelAnimationFrame(this.scrollFrame);
    this.visibilityObserver?.disconnect();
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (
      !this.showMainBar ||
      (event.key !== 'Escape' && event.key !== 'F3') ||
      document.querySelector('dialog:modal')
    )
      return;
    event.preventDefault();
    if (event.key === 'Escape') this.onClose();
    else if (event.shiftKey) this.onPrevious();
    else this.onNext();
  };

  @actionBound private setMainBarVisibility(visible: boolean) {
    this.isMainBarInView = visible;
    if (visible) {
      if (
        this.miniInputRef.current &&
        document.activeElement === this.miniInputRef.current
      ) {
        this.inputRef.current?.focus({ preventScroll: true });
        this.inputRef.current?.select();
      }
      this.miniBarActive = false;
    }
  }

  @actionBound open() {
    this.isOpen = true;
    const rect = this.mainBarRef.current?.getBoundingClientRect();
    this.setMainBarVisibility(
      Boolean(rect && rect.bottom > 0 && rect.top < window.innerHeight),
    );
    this.miniBarActive = !this.isMainBarInView;
    cancelAnimationFrame(this.focusFrame);
    this.focusFrame = requestAnimationFrame(() => {
      const input = this.miniBarActive
        ? this.miniInputRef.current
        : this.inputRef.current;
      input?.focus();
      input?.select();
    });
  }

  @actionBound onClose() {
    this.isOpen = false;
    this.miniBarActive = false;
    this.setQuery('');
    this.inputRef.current?.blur();
    this.miniInputRef.current?.blur();
  }

  @actionBound setQuery(query: string) {
    this.query = query;
    this.activeIndex = 0;
    this.pendingFirstMatch = Boolean(query.trim());
    this.scheduleSearch();
  }

  @actionBound registerFile(
    fileKey: string,
    path: string,
    lines: DiffSearchLineEntry[],
    scrollToRow: (rowId: string) => void,
  ) {
    this.files.set(fileKey, { path, lines });
    this.scrollHandlers.set(fileKey, scrollToRow);
    if (this.query.trim()) this.scheduleSearch();
  }

  @actionBound unregisterFile(fileKey: string) {
    this.files.delete(fileKey);
    this.scrollHandlers.delete(fileKey);
    if (this.query.trim()) this.scheduleSearch();
  }

  private scheduleSearch() {
    this.controller?.abort();
    cancelAnimationFrame(this.searchFrame);
    this.matches = [];
    this.matchCount = 0;
    this.highlights.clear();
    if (this.query.trim())
      this.searchFrame = requestAnimationFrame(() => {
        void this.search();
      });
  }

  private async search() {
    const controller = new AbortController();
    this.controller = controller;
    try {
      await collectDiffSearchMatchesAsync(this.files, this.query, {
        signal: controller.signal,
        onProgress: (matches, rowIds) =>
          runInAction(() => {
            this.matches = matches;
            this.matchCount = matches.length;
            this.highlights.updateHighlightsForRows(
              matches,
              matches[this.activeIndex] ?? null,
              rowIds,
            );
            if (this.pendingFirstMatch && matches[0]) {
              this.pendingFirstMatch = false;
              this.scrollTo(matches[0]);
            }
          }),
      });
      if (!controller.signal.aborted && this.activeIndex >= this.matchCount)
        this.goTo(0);
    } catch (error) {
      if (!controller.signal.aborted) throw error;
    }
  }

  private scrollTo(match: DiffSearchMatch) {
    cancelAnimationFrame(this.scrollFrame);
    document
      .getElementById(getDiffFileElementId(match.fileKey))
      ?.scrollIntoView({ block: 'nearest' });
    if (!isDiffFileHeaderRowId(match.rowId)) {
      this.scrollFrame = requestAnimationFrame(() =>
        this.scrollHandlers.get(match.fileKey)?.(match.rowId),
      );
    }
  }

  @actionBound private goTo(index: number) {
    const previous = this.matches[this.activeIndex] ?? null;
    this.activeIndex = this.matchCount
      ? (index + this.matchCount) % this.matchCount
      : 0;
    const match = this.matches[this.activeIndex];
    if (!match) return;
    this.highlights.updateActiveMatch(this.matches, previous, match);
    this.scrollTo(match);
  }

  @actionBound onNext() {
    this.goTo(this.activeIndex + 1);
  }
  @actionBound onPrevious() {
    this.goTo(this.activeIndex - 1);
  }
}
