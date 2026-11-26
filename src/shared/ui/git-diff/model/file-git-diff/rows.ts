import { actionBound, computed, observable, reaction } from 'mobx';
import { buildDiffVirtualRows } from '@/shared/lib/diff/build-diff-virtual-rows';
import {
  getOrderedCommentableLineKeys,
  getSelectionEndKey,
  getSelectionLineRangeLabel,
} from '@/shared/lib/diff/diff-line-selection';
import type { FileGitDiff } from '.';

export class FileGitDiffRows {
  private static readonly VIRTUALIZE_ROW_THRESHOLD = 80;

  constructor(private readonly file: FileGitDiff) {}

  private readonly expandedThreads = observable.set<string>();

  isThreadExpanded = (discussionId: string) =>
    this.expandedThreads.has(discussionId);

  @actionBound toggleThread(discussionId: string) {
    if (this.expandedThreads.has(discussionId))
      this.expandedThreads.delete(discussionId);
    else this.expandedThreads.add(discussionId);
  }

  watchResolvedThreads() {
    return reaction(
      () =>
        new Set(
          this.virtualRows.flatMap((row) =>
            row.type === 'thread' && row.thread.resolved
              ? [row.thread.discussionId]
              : [],
          ),
        ),
      (resolved, previous) => {
        for (const id of resolved) {
          if (!previous?.has(id)) this.expandedThreads.delete(id);
        }
      },
      { fireImmediately: true },
    );
  }

  @computed get layoutKey() {
    return JSON.stringify([
      this.virtualRows.map((row) => row.id),
      Array.from(this.expandedThreads),
      this.file.selection.formKey,
    ]);
  }

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
  get virtualized() {
    return (
      this.baseVirtualRows.length > FileGitDiffRows.VIRTUALIZE_ROW_THRESHOLD
    );
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
      .filter((row) => row.type === 'line')
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
      !meta.isDiffContentHidden &&
      !content.isReviewCollapsed
    );
  }
}
