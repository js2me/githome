import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import {
  buildChangesTree,
  type ChangesTreeNode,
} from "@/shared/lib/build-changes-tree";

export const CHANGES_FILE_TREE_MIN_WIDTH = 220;
export const CHANGES_FILE_TREE_MAX_WIDTH = 640;
export const CHANGES_FILE_TREE_DEFAULT_WIDTH = 320;

const ROW_DEPTH_PADDING = 16;
const ROW_PADDING_LEFT_BASE = 8;
const ROW_PADDING_RIGHT = 8;
const ROW_GAP = 6;
const ROW_ICON_WIDTH = 16;
const FILE_STATUS_ICON_WIDTH = 14;
const TREE_BORDER_WIDTH = 2;
const SCROLLBAR_GUTTER = 12;

const ROW_LABEL_FONT =
  '13px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const ROW_STATS_FONT =
  '600 12px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace';
const SEARCH_PLACEHOLDER = "Search (e.g. *.vue)";

let measureContext: CanvasRenderingContext2D | null = null;

const getMeasureContext = () => {
  if (typeof document === "undefined") {
    return null;
  }

  if (!measureContext) {
    const canvas = document.createElement("canvas");
    measureContext = canvas.getContext("2d");
  }

  return measureContext;
};

const measureTextWidth = (text: string, font: string) => {
  const context = getMeasureContext();
  if (!context) {
    return text.length * 7.5;
  }

  context.font = font;
  return context.measureText(text).width;
};

export const getMaxChangesFileTreeWidthForViewport = () =>
  Math.min(
    CHANGES_FILE_TREE_MAX_WIDTH,
    Math.max(
      CHANGES_FILE_TREE_MIN_WIDTH,
      window.innerWidth - 480,
    ),
  );

export const clampChangesFileTreeWidth = (value: number) =>
  Math.min(
    CHANGES_FILE_TREE_MAX_WIDTH,
    Math.max(
      CHANGES_FILE_TREE_MIN_WIDTH,
      Math.min(value, getMaxChangesFileTreeWidthForViewport()),
    ),
  );

const formatStats = (additions: number, deletions: number) => {
  const parts: string[] = [];

  if (additions > 0) {
    parts.push(`+${additions}`);
  }

  if (deletions > 0) {
    parts.push(`−${deletions}`);
  }

  return parts.join(" ");
};

const measureNodeRowWidth = (node: ChangesTreeNode, depth: number) => {
  const paddingLeft = depth * ROW_DEPTH_PADDING + ROW_PADDING_LEFT_BASE;
  let width =
    paddingLeft + ROW_ICON_WIDTH + ROW_GAP + measureTextWidth(node.name, ROW_LABEL_FONT);

  if (node.type === "file") {
    const stats = formatStats(node.additions, node.deletions);

    if (stats) {
      width += ROW_GAP + measureTextWidth(stats, ROW_STATS_FONT);
    }

    width += ROW_GAP + FILE_STATUS_ICON_WIDTH;
  }

  return width + ROW_PADDING_RIGHT;
};

const getMaxTreeRowWidth = (nodes: ChangesTreeNode[], depth = 0): number => {
  let max = 0;

  for (const node of nodes) {
    max = Math.max(max, measureNodeRowWidth(node, depth));

    if (node.type === "folder") {
      max = Math.max(max, getMaxTreeRowWidth(node.children, depth + 1));
    }
  }

  return max;
};

export const estimateChangesFileTreeWidth = (
  changes: GitLabMergeRequestChangeDC[],
) => {
  if (changes.length === 0) {
    return CHANGES_FILE_TREE_DEFAULT_WIDTH;
  }

  const tree = buildChangesTree(changes);
  const maxRowWidth = getMaxTreeRowWidth(tree);
  const searchMinWidth =
    24 + measureTextWidth(SEARCH_PLACEHOLDER, ROW_LABEL_FONT) + 24;
  const contentWidth = Math.max(maxRowWidth, searchMinWidth);

  return clampChangesFileTreeWidth(
    Math.ceil(contentWidth + TREE_BORDER_WIDTH + SCROLLBAR_GUTTER),
  );
};
