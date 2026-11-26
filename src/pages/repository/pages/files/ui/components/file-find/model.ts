import {
  actionBound,
  observable,
  observableRef,
  reaction,
  runInAction,
} from 'mobx';
import { createRef } from 'yummies/mobx';
import { registerFindShortcutHandler } from '@/shared/lib/find-shortcut';
import { VM } from '@/shared/lib/view-models/vm';
import {
  type FileSearchTarget,
  findTextRanges,
  indexFileText,
  scrollToMatch,
} from '../../../lib/file-find';

const allMatches = 'githome-file-find';
const currentMatch = 'githome-file-find-current';

interface FileFindPayload {
  content: () => HTMLDivElement | null;
  target: FileSearchTarget | null;
  isMarkdown: boolean;
  ready: boolean;
  onOpen: () => void;
}

export class FileFindVM extends VM<FileFindPayload> {
  readonly input = createRef<HTMLInputElement>();
  readonly trigger = createRef<HTMLButtonElement>();

  @observable accessor isOpen = false;
  @observable accessor query = '';
  @observable accessor index = 0;
  @observable accessor matchCount = 0;
  @observable private accessor startLine = 1;

  private ranges: Range[] = [];
  private observer?: MutationObserver;
  private focusFrame = 0;
  @observableRef private accessor textIndex: ReturnType<typeof indexFileText> =
    null;

  willMount() {
    registerFindShortcutHandler(this.open);
    const options = { fireImmediately: true, signal: this.unmountSignal };

    reaction(
      () => this.payload.target,
      (target) => {
        if (!target) return;
        this.query = target.query;
        this.startLine = this.payload.isMarkdown ? 1 : target.startLine;
        this.isOpen = true;
      },
      options,
    );

    reaction(
      () => (this.isOpen && this.payload.ready ? this.payload.content() : null),
      (root) => {
        this.observer?.disconnect();
        this.textIndex = root
          ? indexFileText(root, this.payload.isMarkdown)
          : null;
        if (root) {
          this.observer = new MutationObserver(() => {
            runInAction(() => {
              this.textIndex = indexFileText(root, this.payload.isMarkdown);
            });
          });
          this.observer.observe(root, {
            subtree: true,
            childList: true,
            characterData: true,
          });
        }
      },
      options,
    );

    reaction(
      () => [this.textIndex, this.query, this.startLine] as const,
      this.updateMatches,
      options,
    );
  }

  didUnmount() {
    registerFindShortcutHandler(null);
    this.observer?.disconnect();
    cancelAnimationFrame(this.focusFrame);
    CSS.highlights?.delete(allMatches);
    CSS.highlights?.delete(currentMatch);
  }

  @actionBound open() {
    if (document.querySelector('dialog:modal')) return;
    this.payload.onOpen();
    this.isOpen = true;
    cancelAnimationFrame(this.focusFrame);
    this.focusFrame = requestAnimationFrame(() => {
      this.input.current?.focus();
      this.input.current?.select();
    });
  }

  @actionBound close() {
    this.isOpen = false;
    cancelAnimationFrame(this.focusFrame);
    this.trigger.current?.focus({ preventScroll: true });
  }

  @actionBound toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  @actionBound setQuery(query: string) {
    this.startLine = 1;
    this.query = query;
  }

  @actionBound move(step: number) {
    if (!this.matchCount) return;
    this.index = (this.index + step + this.matchCount) % this.matchCount;
    this.showCurrentMatch();
  }

  @actionBound private updateMatches() {
    const { ranges, initialIndex } =
      this.isOpen && this.textIndex && this.query.trim()
        ? findTextRanges(this.textIndex, this.query, this.startLine)
        : { ranges: [], initialIndex: 0 };

    this.ranges = ranges;
    this.matchCount = ranges.length;
    this.index = initialIndex;
    if (CSS.highlights && ranges.length) {
      const highlight = new Highlight();
      for (const range of ranges) highlight.add(range);
      CSS.highlights.set(allMatches, highlight);
    } else {
      CSS.highlights?.delete(allMatches);
    }
    this.showCurrentMatch();
  }

  private showCurrentMatch() {
    const match = this.ranges[this.index];
    if (!match) {
      CSS.highlights?.delete(currentMatch);
      return;
    }
    if (CSS.highlights) {
      const highlight = new Highlight(match);
      highlight.priority = 1;
      CSS.highlights.set(currentMatch, highlight);
    }
    scrollToMatch(match);
  }
}
