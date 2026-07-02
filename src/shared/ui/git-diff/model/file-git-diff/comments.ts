import { action, observable } from "mobx";
import type { FileGitDiff } from ".";

export class FileGitDiffComments {
  @observable accessor isFileCommentOpen = false;
  @observable accessor fileCommentBody = "";

  constructor(private readonly file: FileGitDiff) {}

  @action.bound
  toggleFileCommentOpen() {
    this.isFileCommentOpen = !this.isFileCommentOpen;
    this.file.selection.lineSelection = null;
    this.file.selection.selectionAnchorKey = null;
  }

  @action.bound
  setFileCommentBody(value: string) {
    this.fileCommentBody = value;
  }

  @action.bound
  cancelFileComment() {
    this.isFileCommentOpen = false;
    this.fileCommentBody = "";
    this.file.parent.payload.onClearSubmitError();
  }

  @action.bound
  async submitFileComment() {
    if (!this.fileCommentBody.trim()) {
      return;
    }

    const { change } = this.file.meta;
    const success = await this.file.parent.payload.onAddComment({
      body: this.fileCommentBody.trim(),
      oldPath: change.old_path,
      newPath: change.new_path,
      oldLine: null,
      newLine: null,
    });

    if (success) {
      this.cancelFileComment();
    }
  }
}
