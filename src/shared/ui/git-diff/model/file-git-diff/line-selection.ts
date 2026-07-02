import { action, observable, reaction, runInAction } from "mobx";
import type { DiffLineSelection } from "@/shared/lib/diff-line-selection";
import {
  getLineFromVirtualRows,
  isMultiLineSelection,
  normalizeDiffLineSelection,
} from "@/shared/lib/diff-line-selection";
import type { CreateDiffCommentInput } from "@/shared/lib/gitlab/diff-comment";
import { getDiffLineSide } from "@/shared/lib/gitlab/line-code";
import type { FileGitDiff } from ".";
import { DisposableModel } from "./disposable";

export class FileGitDiffLineSelection extends DisposableModel {
  @observable accessor lineSelection: DiffLineSelection | null = null;
  @observable accessor selectionAnchorKey: string | null = null;
  @observable accessor commentBody = "";
  @observable accessor isDraggingSelection = false;

  private dragMoved = false;

  constructor(private readonly file: FileGitDiff) {
    super();
    this.setupReactions();
  }

  @action.bound
  clearSelection() {
    this.lineSelection = null;
    this.selectionAnchorKey = null;
    this.commentBody = "";
    this.file.parent.payload.onClearSubmitError();
  }

  @action.bound
  applyLineSelection(lineKey: string, shiftKey: boolean) {
    if (!this.file.parent.payload.canComment) {
      return;
    }

    if (
      !shiftKey &&
      this.lineSelection &&
      this.lineSelection.startKey === lineKey &&
      this.lineSelection.endKey === lineKey
    ) {
      this.clearSelection();
      return;
    }

    const orderedLineKeys = this.file.rows.orderedLineKeys;
    const anchorKey = shiftKey
      ? (this.selectionAnchorKey ?? lineKey)
      : lineKey;
    const nextSelection = normalizeDiffLineSelection(
      anchorKey,
      lineKey,
      orderedLineKeys,
    );

    this.lineSelection = nextSelection;
    this.selectionAnchorKey = anchorKey;
    this.commentBody = "";
    this.file.parent.payload.onClearSubmitError();
  }

  @action.bound
  handleLineClick(lineKey: string, shiftKey: boolean) {
    if (this.dragMoved) {
      this.dragMoved = false;
      return;
    }

    this.applyLineSelection(lineKey, shiftKey);
  }

  @action.bound
  handleLineMouseDown(lineKey: string) {
    if (!this.file.parent.payload.canComment) {
      return;
    }

    this.dragMoved = false;
    this.isDraggingSelection = true;
    this.selectionAnchorKey = lineKey;
    this.lineSelection = { startKey: lineKey, endKey: lineKey };
    this.commentBody = "";
    this.file.parent.payload.onClearSubmitError();
  }

  @action.bound
  handleLineMouseEnter(lineKey: string) {
    if (!this.isDraggingSelection || !this.selectionAnchorKey) {
      return;
    }

    this.dragMoved = true;
    this.lineSelection = normalizeDiffLineSelection(
      this.selectionAnchorKey,
      lineKey,
      this.file.rows.orderedLineKeys,
    );
  }

  @action.bound
  setCommentBody(value: string) {
    this.commentBody = value;
  }

  @action.bound
  async submitLineComment() {
    if (!this.lineSelection) {
      return;
    }

    const { rows, meta } = this.file;
    const normalized = normalizeDiffLineSelection(
      this.lineSelection.startKey,
      this.lineSelection.endKey,
      rows.orderedLineKeys,
    );
    const endLine = getLineFromVirtualRows(
      rows.baseVirtualRows,
      normalized.endKey,
    );
    const startLine = getLineFromVirtualRows(
      rows.baseVirtualRows,
      normalized.startKey,
    );

    if (!endLine) {
      return;
    }

    const input: CreateDiffCommentInput = {
      body: this.commentBody,
      oldPath: meta.change.old_path,
      newPath: meta.change.new_path,
      oldLine: endLine.oldLine,
      newLine: endLine.newLine,
    };

    if (
      startLine &&
      isMultiLineSelection(this.lineSelection, rows.orderedLineKeys)
    ) {
      input.lineRange = {
        start: {
          oldLine: startLine.oldLine,
          newLine: startLine.newLine,
          type: getDiffLineSide(startLine),
        },
        end: {
          oldLine: endLine.oldLine,
          newLine: endLine.newLine,
          type: getDiffLineSide(endLine),
        },
      };
    }

    const success = await this.file.parent.payload.onAddComment(input);

    if (success) {
      this.clearSelection();
    }
  }

  private setupReactions() {
    this.disposers.push(
      reaction(
        () => this.isDraggingSelection,
        (isDragging) => {
          if (!isDragging) {
            return;
          }

          const handleMouseUp = () => {
            runInAction(() => {
              this.isDraggingSelection = false;
            });
          };

          window.addEventListener("mouseup", handleMouseUp);

          return () => {
            window.removeEventListener("mouseup", handleMouseUp);
          };
        },
      ),
    );
  }
}
