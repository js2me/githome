import type { VirtualDiffRow } from "@/shared/lib/build-diff-virtual-rows";
import type { DiffDisplayLine } from "@/shared/lib/parse-unified-diff";

export interface DiffLineSelection {
  startKey: string;
  endKey: string;
}

export const getOrderedCommentableLineKeys = (
  rows: VirtualDiffRow[],
): string[] => {
  const keys: string[] = [];

  for (const row of rows) {
    if (row.type === "line" && row.lineKey) {
      keys.push(row.lineKey);
    }
  }

  return keys;
};

export const normalizeDiffLineSelection = (
  startKey: string,
  endKey: string,
  orderedKeys: string[],
): DiffLineSelection => {
  const startIndex = orderedKeys.indexOf(startKey);
  const endIndex = orderedKeys.indexOf(endKey);

  if (startIndex === -1 || endIndex === -1) {
    return { startKey, endKey };
  }

  if (startIndex <= endIndex) {
    return { startKey, endKey };
  }

  return { startKey: endKey, endKey: startKey };
};

export const isLineKeyInSelection = (
  lineKey: string,
  selection: DiffLineSelection | null,
  orderedKeys: string[],
): boolean => {
  if (!selection) {
    return false;
  }

  const startIndex = orderedKeys.indexOf(selection.startKey);
  const endIndex = orderedKeys.indexOf(selection.endKey);
  const lineIndex = orderedKeys.indexOf(lineKey);

  if (startIndex === -1 || endIndex === -1 || lineIndex === -1) {
    return false;
  }

  const minIndex = Math.min(startIndex, endIndex);
  const maxIndex = Math.max(startIndex, endIndex);

  return lineIndex >= minIndex && lineIndex <= maxIndex;
};

export const getSelectionEndKey = (
  selection: DiffLineSelection,
  orderedKeys: string[],
): string => {
  const startIndex = orderedKeys.indexOf(selection.startKey);
  const endIndex = orderedKeys.indexOf(selection.endKey);

  if (startIndex === -1 || endIndex === -1) {
    return selection.endKey;
  }

  return startIndex <= endIndex ? selection.endKey : selection.startKey;
};

export const isMultiLineSelection = (
  selection: DiffLineSelection,
  orderedKeys: string[],
): boolean => {
  const startIndex = orderedKeys.indexOf(selection.startKey);
  const endIndex = orderedKeys.indexOf(selection.endKey);

  if (startIndex === -1 || endIndex === -1) {
    return selection.startKey !== selection.endKey;
  }

  return startIndex !== endIndex;
};

export const getLineFromVirtualRows = (
  rows: VirtualDiffRow[],
  lineKey: string,
): DiffDisplayLine | null => {
  const row = rows.find(
    (item) => item.type === "line" && item.lineKey === lineKey,
  );

  return row?.type === "line" ? row.line : null;
};

export const getSelectionLineRangeLabel = (
  selection: DiffLineSelection,
  rows: VirtualDiffRow[],
  orderedKeys: string[],
): string | null => {
  if (!isMultiLineSelection(selection, orderedKeys)) {
    return null;
  }

  const normalized = normalizeDiffLineSelection(
    selection.startKey,
    selection.endKey,
    orderedKeys,
  );
  const startLine = getLineFromVirtualRows(rows, normalized.startKey);
  const endLine = getLineFromVirtualRows(rows, normalized.endKey);

  if (!startLine || !endLine) {
    return null;
  }

  const formatLine = (line: DiffDisplayLine) => {
    if (line.type === "delete" && line.oldLine !== null) {
      return `−${line.oldLine}`;
    }

    if (line.newLine !== null) {
      return `+${line.newLine}`;
    }

    return "?";
  };

  return `${formatLine(startLine)} – ${formatLine(endLine)}`;
};
