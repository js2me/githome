import { actionBound, autorun, observable } from 'mobx';
import { createRef } from 'yummies/mobx';
import type { DiffSearchVM } from '../diff-search';
import type { FileGitDiff } from '.';

export class FileGitDiffNavigation {
  private scrollToRowHandler?: (rowId: string) => void;
  @observable accessor scrollMargin = 0;
  private resizeObserver?: ResizeObserver;
  readonly listRef = createRef<HTMLDivElement>({
    onChange: (element) => {
      this.resizeObserver?.disconnect();
      window.removeEventListener('resize', this.measureMargin);
      window.removeEventListener('scroll', this.measureMargin);
      if (element) {
        this.measureMargin();
        this.resizeObserver = new ResizeObserver(this.measureMargin);
        this.resizeObserver.observe(element);
        this.resizeObserver.observe(document.body);
        window.addEventListener('scroll', this.measureMargin, {
          passive: true,
        });
        window.addEventListener('resize', this.measureMargin);
      }
    },
  });

  constructor(private readonly file: FileGitDiff) {}

  @actionBound measureMargin() {
    const element = this.listRef.current;
    if (element)
      this.scrollMargin = element.getBoundingClientRect().top + window.scrollY;
  }

  @actionBound setActive() {
    this.file.parent.payload.onActiveFileChange?.(this.file.meta.fileKey);
  }

  registerScrollToRow(scrollToRow: (rowId: string) => void) {
    this.scrollToRowHandler = scrollToRow;
    return () => {
      this.scrollToRowHandler = undefined;
    };
  }

  @actionBound scrollToRow(rowId: string) {
    if (this.scrollToRowHandler) this.scrollToRowHandler(rowId);
    else
      document
        .querySelector(`[data-diff-row-id="${CSS.escape(rowId)}"]`)
        ?.scrollIntoView({ block: 'center' });
  }

  registerSearch(search: DiffSearchVM) {
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
    this.scrollToRowHandler = undefined;
  }
}
