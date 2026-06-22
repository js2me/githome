import type { GitLabHighlightedDiffLineDC } from "@/shared/api/gitlab/data-contracts";

export type { GitLabHighlightedDiffLineDC };

const decodeHtmlEntities = (value: string) => {
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

const getLineText = (line: GitLabHighlightedDiffLineDC) => {
  const raw = line.rich_text ?? line.text ?? "";
  return decodeHtmlEntities(raw);
};

const isDiffLine = (type: string | null | undefined) =>
  type === "old" ||
  type === "new" ||
  type === "old-nonewline" ||
  type === "new-nonewline" ||
  !type;

export const buildUnifiedDiffFromGitlabLines = (
  lines: GitLabHighlightedDiffLineDC[],
): string => {
  const output: string[] = [];
  let hunkLines: string[] = [];
  let hunkOldStart = 1;
  let hunkNewStart = 1;
  let hunkOldCount = 0;
  let hunkNewCount = 0;

  const flushHunk = () => {
    if (hunkLines.length === 0) {
      return;
    }

    output.push(
      `@@ -${hunkOldStart},${hunkOldCount} +${hunkNewStart},${hunkNewCount} @@`,
    );
    output.push(...hunkLines);
    hunkLines = [];
    hunkOldCount = 0;
    hunkNewCount = 0;
  };

  for (const line of lines) {
    if (line.type === "match") {
      flushHunk();
      continue;
    }

    if (!isDiffLine(line.type)) {
      continue;
    }

    const text = getLineText(line);

    if (hunkLines.length === 0) {
      hunkOldStart = line.old_line ?? line.new_line ?? 1;
      hunkNewStart = line.new_line ?? line.old_line ?? 1;
    }

    if (line.type === "old" || line.type === "old-nonewline") {
      hunkLines.push(`-${text}`);
      hunkOldCount += 1;
      continue;
    }

    if (line.type === "new" || line.type === "new-nonewline") {
      hunkLines.push(`+${text}`);
      hunkNewCount += 1;
      continue;
    }

    hunkLines.push(` ${text}`);
    hunkOldCount += 1;
    hunkNewCount += 1;
  }

  flushHunk();

  return output.join("\n");
};
