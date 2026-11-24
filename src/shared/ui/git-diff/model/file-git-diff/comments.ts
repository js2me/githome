import { actionBound, observable } from "mobx";
import type { FileGitDiff } from ".";

export class FileGitDiffComments {
  @observable accessor isFileCommentOpen = false;

  constructor(private readonly file: FileGitDiff) {}

  @actionBound
  toggleFileCommentOpen() {
    this.isFileCommentOpen = !this.isFileCommentOpen;
    this.file.selection.lineSelection = null;
    this.file.selection.selectionAnchorKey = null;
  }

  @actionBound
  cancelFileComment() {
    this.isFileCommentOpen = false;
    this.file.parent.payload.onClearSubmitError();
  }

  @actionBound
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
