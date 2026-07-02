import { action, computed, observable, reaction } from "mobx";
import {
  buildContextLines,
  getDiffExpandGaps,
  getEndExpandStateKey,
  getNextExpandReveal,
  getNextExpandRevealFromEnd,
  getRevealedFromEnd,
  getRevealedFromStart,
  getVisibleLineRange,
  getVisibleLineRangeFromEnd,
  isGapClosedByContext,
  isGapFullyExpanded,
  supportsExpandFromEnd,
  type DiffExpandMode,
  type DiffExpandState,
} from "@/shared/lib/expand-diff-context";
import type { DiffDisplayLine } from "@/shared/lib/parse-unified-diff";
import type { FileGitDiff } from ".";
import { DisposableModel } from "./disposable";

export class FileGitDiffContextExpand extends DisposableModel {
  @observable accessor expandState: DiffExpandState = {};
  @observable accessor loadingGapId: string | null = null;
  @observable accessor fileLineCount: number | null = null;
  @observable accessor fileCacheVersion = 0;

  private readonly fileLinesCache = new Map<string, string[]>();

  constructor(private readonly file: FileGitDiff) {
    super();
    this.setupReactions();
  }

  protected onDispose() {
    this.fileLinesCache.clear();
  }

  @computed
  get expandGaps() {
    const { content, meta } = this.file;

    if (!content.parsed || !meta.canExpand) {
      return [];
    }

    return getDiffExpandGaps(content.parsed, this.fileLineCount);
  }

  @computed
  get contextLinesByGapId(): Record<string, DiffDisplayLine[]> {
    void this.fileCacheVersion;

    const { meta } = this.file;

    if (!meta.canExpand || !meta.fileRef) {
      return {};
    }

    const cacheKey = `${meta.fileRef}:${meta.filePath}`;
    const fileLines = this.fileLinesCache.get(cacheKey);
    if (!fileLines) {
      return {};
    }

    const result: Record<string, DiffDisplayLine[]> = {};

    for (const gap of this.expandGaps) {
      if (this.expandState[gap.id] === "all") {
        const revealCount = gap.hiddenCount ?? 0;
        if (revealCount <= 0) {
          continue;
        }

        const range = getVisibleLineRange(gap, revealCount, this.expandState);
        if (!range) {
          continue;
        }

        const endLine = Math.min(range.endLine, fileLines.length);
        if (endLine < range.startLine) {
          continue;
        }

        result[gap.id] = buildContextLines(
          fileLines,
          range.startLine,
          endLine,
        );
        continue;
      }

      const startReveal = getRevealedFromStart(gap, this.expandState);
      if (startReveal > 0) {
        const range = getVisibleLineRange(gap, startReveal, this.expandState);
        if (range) {
          const endLine = Math.min(range.endLine, fileLines.length);
          if (endLine >= range.startLine) {
            result[gap.id] = buildContextLines(
              fileLines,
              range.startLine,
              endLine,
            );
          }
        }
      }

      if (supportsExpandFromEnd(gap)) {
        const endReveal = getRevealedFromEnd(gap, this.expandState);
        if (endReveal > 0) {
          const range = getVisibleLineRangeFromEnd(
            gap,
            endReveal,
            this.expandState,
          );
          if (range) {
            const endLine = Math.min(range.endLine, fileLines.length);
            if (endLine >= range.startLine) {
              result[getEndExpandStateKey(gap.id)] = buildContextLines(
                fileLines,
                range.startLine,
                endLine,
              );
            }
          }
        }
      }

      const gapFullyOpen =
        isGapFullyExpanded(gap, this.expandState) ||
        isGapClosedByContext(gap, result);

      if (
        gapFullyOpen &&
        gap.newLineEnd !== null &&
        gap.hiddenCount !== null &&
        gap.hiddenCount > 0
      ) {
        result[gap.id] = buildContextLines(
          fileLines,
          gap.newLineStart,
          Math.min(gap.newLineEnd, fileLines.length),
        );
        delete result[getEndExpandStateKey(gap.id)];
      }
    }

    return result;
  }

  @action.bound
  resetOnPathChange() {
    this.expandState = {};
    this.loadingGapId = null;
  }

  @action.bound
  async loadFileLines() {
    const { meta, parent } = this.file;
    const loadFileContent = parent.payload.loadFileContent;

    if (!loadFileContent || !meta.fileRef) {
      return [];
    }

    const cacheKey = `${meta.fileRef}:${meta.filePath}`;
    const cached = this.fileLinesCache.get(cacheKey);
    if (cached) {
      this.fileLineCount = cached.length;
      return cached;
    }

    const content = await loadFileContent(meta.filePath, meta.fileRef);
    const lines = content.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }
    this.fileLinesCache.set(cacheKey, lines);
    this.fileLineCount = lines.length;
    this.fileCacheVersion += 1;
    return lines;
  }

  @action.bound
  async expandGap(gapId: string, mode: DiffExpandMode) {
    const { meta } = this.file;

    if (!meta.canExpand) {
      return;
    }

    const gap = this.expandGaps.find((item) => item.id === gapId);
    if (!gap) {
      return;
    }

    this.loadingGapId = gapId;

    try {
      await this.loadFileLines();

      if (mode === "all") {
        const next = { ...this.expandState, [gapId]: "all" as const };
        delete next[getEndExpandStateKey(gapId)];
        this.expandState = next;
        return;
      }

      if (mode === "chunk-up" && supportsExpandFromEnd(gap)) {
        const endKey = getEndExpandStateKey(gapId);
        const nextReveal = getNextExpandRevealFromEnd(gap, this.expandState);
        const next = { ...this.expandState, [endKey]: nextReveal };

        if (isGapFullyExpanded(gap, next)) {
          next[gapId] = "all";
          delete next[endKey];
        }

        this.expandState = next;
        return;
      }

      const nextReveal = getNextExpandReveal(gap, this.expandState);
      const next = { ...this.expandState, [gapId]: nextReveal };

      if (isGapFullyExpanded(gap, next)) {
        next[gapId] = "all";
        delete next[getEndExpandStateKey(gapId)];
      }

      this.expandState = next;
    } finally {
      this.loadingGapId = null;
    }
  }

  private setupReactions() {
    this.disposers.push(
      reaction(
        () => this.file.meta.canExpand && Boolean(this.file.content.parsed),
        (shouldLoad) => {
          if (shouldLoad) {
            void this.loadFileLines();
          }
        },
      ),
    );

    this.disposers.push(
      reaction(
        () => ({
          canExpand: this.file.meta.canExpand,
          expandGaps: this.expandGaps,
          expandState: this.expandState,
          contextLinesByGapId: this.contextLinesByGapId,
        }),
        ({ canExpand, expandGaps, expandState, contextLinesByGapId }) => {
          if (!canExpand || expandGaps.length === 0) {
            return;
          }

          const gapsToNormalize = expandGaps.filter(
            (gap) =>
              expandState[gap.id] !== "all" &&
              isGapClosedByContext(gap, contextLinesByGapId),
          );

          if (gapsToNormalize.length === 0) {
            return;
          }

          const next = { ...expandState };
          let changed = false;

          for (const gap of gapsToNormalize) {
            if (next[gap.id] === "all") {
              continue;
            }

            next[gap.id] = "all";
            delete next[getEndExpandStateKey(gap.id)];
            changed = true;
          }

          if (changed) {
            this.expandState = next;
          }
        },
      ),
    );
  }
}
