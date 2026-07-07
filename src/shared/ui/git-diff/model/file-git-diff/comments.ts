import { action, observable } from "mobx";
import type { FileGitDiff } from ".";

export class FileGitDiffComments {
  @observable accessor isFileCommentOpen = false;

  constructor(private readonly file: FileGitDiff) {}

  @action.bound
  toggleFileCommentOpen() {
    this.isFileCommentOpen = !this.isFileCommentOpen;
    this.file.selection.lineSelection = null;
    this.file.selection.selectionAnchorKey = null;
  }

  @action.bound
  cancelFileComment() {
    this.isFileCommentOpen = false;
    this.file.parent.payload.onClearSubmitError();
  }

  @action.bound
  async submitFileComment(body: string) {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      return;
    }

    const { change } = this.file.meta;
    const success = await this.file.parent.payload.onAddComment({
      body: trimmedBody,
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
