import type { Virtualizer } from '@tanstack/react-virtual';
import { actionBound, autorun, observable, reaction } from 'mobx';
import { createRef } from 'yummies/mobx';
import {
  codeFontSizeKey,
  wrapSourceCodeKey,
} from '@/shared/lib/code-view-preferences';
import type { DiffSearchVM } from '../../diff-search';
import type { FileGitDiff } from '..';

export class FileGitDiffNavigation {
  @observable accessor scrollMargin = 0;
  private virtualizer?: Virtualizer<Window, HTMLDivElement>;
  private readonly viewportRefs = new WeakMap<
    Virtualizer<Window, HTMLDivElement>,
    (element: HTMLDivElement | null) => void
  >();
  private stopBody?: () => void;
  private stopSearch?: () => void;
  private readonly watchSearch: () => void;

  readonly bodyRef = createRef<HTMLDivElement>({
    onChange: (element) => {
      this.stopBody?.();
      this.stopBody = undefined;
      if (!element) return;

      const { rows, selection } = this.file;
      const stopThreads = rows.watchResolvedThreads();
      let scrollFrame = 0;
      const stopScroll = reaction(
        () => [selection.formKey, rows.commentFormLineKey] as const,
        ([, lineKey]) => {
          cancelAnimationFrame(scrollFrame);
          if (lineKey) {
            scrollFrame = requestAnimationFrame(() =>
              this.scrollToRow(`comment-form:${lineKey}`),
            );
          }
        },
        { fireImmediately: true },
      );

      const controller = new AbortController();
      let stopMeasuring: (() => void) | undefined;
      if (this.virtualizer) {
        stopMeasuring = this.watchMeasurements(
          element,
          this.virtualizer,
          controller.signal,
        );
      }
      this.stopBody = () => {
        stopThreads();
        stopScroll();
        stopMeasuring?.();
        controller.abort();
        cancelAnimationFrame(scrollFrame);
      };
    },
  });

  constructor(private readonly file: FileGitDiff) {
    this.watchSearch = reaction(
      () => file.parent.payload.searchRegistration,
      (search) => {
        this.stopSearch?.();
        this.stopSearch = search ? this.registerSearch(search) : undefined;
      },
      { fireImmediately: true },
    );
  }

  getViewportRef(virtualizer: Virtualizer<Window, HTMLDivElement>) {
    let ref = this.viewportRefs.get(virtualizer);
    if (!ref) {
      ref = (element) => {
        this.virtualizer = element ? virtualizer : undefined;
        this.bodyRef(element);
      };
      this.viewportRefs.set(virtualizer, ref);
    }
    return ref;
  }

  private watchMeasurements(
    element: HTMLDivElement,
    virtualizer: Virtualizer<Window, HTMLDivElement>,
    signal: AbortSignal,
  ) {
    this.measureMargin();
    const observer = new ResizeObserver(this.measureMargin);
    observer.observe(element);
    observer.observe(document.body);
    window.addEventListener('scroll', this.measureMargin, {
      passive: true,
      signal,
    });
    window.addEventListener('resize', this.measureMargin, { signal });

    let frame = 0;
    const stop = reaction(
      () =>
        [
          codeFontSizeKey.value,
          wrapSourceCodeKey.value,
          this.file.rows.layoutKey,
        ] as const,
      () => {
        cancelAnimationFrame(frame);
        // Invalidate sizes once the new rows and styles are committed.
        frame = requestAnimationFrame(() => {
          this.measureMargin();
          virtualizer.measure();
          for (const row of element.querySelectorAll<HTMLDivElement>(
            ':scope > div > [data-index]',
          )) {
            virtualizer.measureElement(row);
          }
        });
      },
      { fireImmediately: true },
    );

    return () => {
      observer.disconnect();
      stop();
      cancelAnimationFrame(frame);
    };
  }

  @actionBound private measureMargin() {
    const element = this.bodyRef.current;
    if (element)
      this.scrollMargin = element.getBoundingClientRect().top + window.scrollY;
  }

  @actionBound setActive() {
    this.file.parent.payload.onActiveFileChange?.(this.file.meta.fileKey);
  }

  @actionBound scrollToRow(rowId: string) {
    if (this.virtualizer) {
      const index = this.file.rows.virtualRows.findIndex(
        (row) => row.id === rowId,
      );
      if (index >= 0)
        this.virtualizer.scrollToIndex(index, { align: 'center' });
    } else {
      this.bodyRef.current
        ?.querySelector(`[data-diff-row-id="${CSS.escape(rowId)}"]`)
        ?.scrollIntoView({ block: 'center' });
    }
  }

  private registerSearch(search: DiffSearchVM) {
    const { rows, meta } = this.file;
    const key = meta.fileKey;
    const stop = autorun(() => {
      search.registerFile(
        key,
        meta.searchFilePath,
        rows.includeCodeLinesInSearch ? rows.searchLines : [],
        this.scrollToRow,
      );
    });
    return () => {
      stop();
      search.unregisterFile(key);
    };
  }

  dispose() {
    this.watchSearch();
    this.stopSearch?.();
    this.stopBody?.();
    this.stopBody = undefined;
    this.virtualizer = undefined;
  }
}
