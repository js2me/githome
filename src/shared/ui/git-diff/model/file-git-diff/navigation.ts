import { action } from "mobx";
import type { FileGitDiff } from ".";

export class FileGitDiffNavigation {
  private scrollToRowHandler: (rowId: string) => void = () => {};

  constructor(private readonly file: FileGitDiff) {}

  @action.bound
  setActive() {
    this.file.parent.payload.onActiveFileChange?.(this.file.meta.fileKey);
  }

  @action.bound
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
