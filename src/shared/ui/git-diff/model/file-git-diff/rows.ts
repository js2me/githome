import { computed } from "mobx";
import { buildDiffVirtualRows } from "@/shared/lib/build-diff-virtual-rows";
import {
  getOrderedCommentableLineKeys,
  getSelectionEndKey,
  getSelectionLineRangeLabel,
} from "@/shared/lib/diff-line-selection";
import type { FileGitDiff } from ".";

export class FileGitDiffRows {
  readonly virtualized = false;

  constructor(private readonly file: FileGitDiff) {}

  private get expandConfig() {
    const { expand, meta } = this.file;

    if (!meta.canExpand) {
      return undefined;
    }

    return {
      gaps: expand.expandGaps,
      expandState: expand.expandState,
      contextLinesByGapId: expand.contextLinesByGapId,
      loadingGapId: expand.loadingGapId,
    };
  }

  @computed
  get baseVirtualRows() {
    const { content, meta } = this.file;

    if (!content.parsed) {
      return [];
    }

    return buildDiffVirtualRows({
      change: meta.change,
      parsed: content.parsed,
      threadIndex: meta.threadIndex,
      commentFormLineKey: null,
      expand: this.expandConfig,
    });
  }

  @computed
  get orderedLineKeys() {
    return getOrderedCommentableLineKeys(this.baseVirtualRows);
  }

  @computed
  get commentFormLineKey() {
    const { selection } = this.file;

    if (!selection.lineSelection) {
      return null;
    }

    return getSelectionEndKey(selection.lineSelection, this.orderedLineKeys);
  }

  @computed
  get virtualRows() {
    const { content, meta } = this.file;

    if (!content.parsed) {
      return [];
    }

    return buildDiffVirtualRows({
      change: meta.change,
      parsed: content.parsed,
      threadIndex: meta.threadIndex,
      commentFormLineKey: this.commentFormLineKey,
      expand: this.expandConfig,
    });
  }

  @computed
  get selectionRangeLabel() {
    const { selection } = this.file;

    if (!selection.lineSelection) {
      return null;
    }

    return getSelectionLineRangeLabel(
      selection.lineSelection,
      this.baseVirtualRows,
      this.orderedLineKeys,
    );
  }

  @computed
  get searchLines() {
    return this.virtualRows
      .filter((row) => row.type === "line")
      .map((row) => ({
        rowId: row.id,
        text: row.line.text,
      }));
  }

  @computed
  get includeCodeLinesInSearch() {
    const { content, meta } = this.file;

    return (
      Boolean(content.parsed) &&
      this.virtualRows.length > 0 &&
      !(meta.isAutoCollapsed && !content.isFileExpanded)
    );
  }
}
