import { actionBound } from "mobx";
import type { FileGitDiff } from ".";

export class FileGitDiffNavigation {
  private scrollToRowHandler: (rowId: string) => void = () => {};

  constructor(private readonly file: FileGitDiff) {}

  @actionBound
  setActive() {
    this.file.parent.payload.onActiveFileChange?.(this.file.meta.fileKey);
  }

  @actionBound
  registerScrollToRow(scrollToRow: (rowId: string) => void) {
    this.scrollToRowHandler = scrollToRow;
  }

  scrollToRow(rowId: string) {
    this.scrollToRowHandler(rowId);
  }

  dispose() {
    this.scrollToRowHandler = () => {};
  }
}
