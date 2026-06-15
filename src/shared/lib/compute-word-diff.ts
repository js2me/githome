import { diffWordsWithSpace } from "diff";

export interface WordDiffSegment {
  text: string;
  highlight: "add" | "del" | null;
}

export const computeWordDiffSegments = (
  oldText: string,
  newText: string,
  variant: "delete" | "add",
): WordDiffSegment[] => {
  const changes =
    variant === "delete"
      ? diffWordsWithSpace(newText, oldText)
      : diffWordsWithSpace(oldText, newText);

  const segments: WordDiffSegment[] = [];

  for (const change of changes) {
    if (change.added) {
      segments.push({
        text: change.value,
        highlight: variant === "delete" ? "del" : "add",
      });
      continue;
    }

    if (change.removed) {
      continue;
    }

    segments.push({
      text: change.value,
      highlight: null,
    });
  }

  return segments;
};
