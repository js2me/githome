import { actionBound, computed, observable } from 'mobx';
import type { DiffLineSelection } from '@/shared/lib/diff/diff-line-selection';
import {
  getLineFromVirtualRows,
  isMultiLineSelection,
  normalizeDiffLineSelection,
} from '@/shared/lib/diff/diff-line-selection';
import { getDiffLineSide } from '@/shared/lib/gitlab/diff/line-code';
import type { CreateDiffCommentInput } from '@/shared/lib/gitlab/discussions/diff-comment';
import type { FileGitDiff } from '..';
import { DisposableModel } from '../disposable';

export class FileGitDiffLineSelection extends DisposableModel {
  @observable accessor lineSelection: DiffLineSelection | null = null;
  @observable accessor selectionAnchorKey: string | null = null;
  @observable accessor isDraggingSelection = false;

  @computed get formKey() {
    const selection = this.lineSelection;
    return selection ? `${selection.startKey}\0${selection.endKey}` : undefined;
  }

  @computed get selectedKeys() {
    const selection = this.lineSelection;
    const keys = this.file.rows.orderedLineKeys;
    if (!selection) return new Set<string>();
    const start = keys.indexOf(selection.startKey);
    const end = keys.indexOf(selection.endKey);
    return new Set(
      start >= 0 && end >= start ? keys.slice(start, end + 1) : [],
    );
  }

  private dragMoved = false;

  constructor(private readonly file: FileGitDiff) {
    super();
  }

  @actionBound
  clearSelection() {
    this.lineSelection = null;
    this.selectionAnchorKey = null;
    this.file.parent.payload.onClearSubmitError();
  }

  @actionBound
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
    const anchorKey = shiftKey ? (this.selectionAnchorKey ?? lineKey) : lineKey;
    const nextSelection = normalizeDiffLineSelection(
      anchorKey,
      lineKey,
      orderedLineKeys,
    );

    this.lineSelection = nextSelection;
    this.selectionAnchorKey = anchorKey;
    this.file.parent.payload.onClearSubmitError();
  }

  @actionBound
  handleLineClick(lineKey: string, shiftKey: boolean) {
    if (this.dragMoved) {
      this.dragMoved = false;
      return;
    }

    this.applyLineSelection(lineKey, shiftKey);
  }

  @actionBound
  handleLineMouseDown(lineKey: string) {
    if (!this.file.parent.payload.canComment) {
      return;
    }

    this.dragMoved = false;
    this.isDraggingSelection = true;
    window.addEventListener('mouseup', this.finishDrag, { once: true });
    this.selectionAnchorKey = lineKey;
    this.lineSelection = { startKey: lineKey, endKey: lineKey };
    this.file.parent.payload.onClearSubmitError();
  }

  @actionBound
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

  @actionBound
  async submitLineComment(body: string) {
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
      body,
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

  @actionBound private finishDrag() {
    this.isDraggingSelection = false;
  }

  protected override onDispose() {
    if (this.isDraggingSelection)
      window.removeEventListener('mouseup', this.finishDrag);
  }
}
