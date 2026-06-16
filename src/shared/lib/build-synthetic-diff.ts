import { createTwoFilesPatch } from "diff";

const splitContentLines = (content: string) => {
  const lines = content.split("\n");

  if (content.endsWith("\n") && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines;
};

export const buildNewFileUnifiedDiff = (
  path: string,
  content: string,
): string => {
  const lines = splitContentLines(content);
  const body = lines.map((line) => `+${line}`).join("\n");

  return [
    `diff --git a/${path} b/${path}`,
    "new file mode 100644",
    "--- /dev/null",
    `+++ b/${path}`,
    `@@ -0,0 +1,${lines.length} @@`,
    body,
  ].join("\n");
};

export const buildDeletedFileUnifiedDiff = (
  path: string,
  content: string,
): string => {
  const lines = splitContentLines(content);
  const body = lines.map((line) => `-${line}`).join("\n");

  return [
    `diff --git a/${path} b/${path}`,
    "deleted file mode 100644",
    `--- a/${path}`,
    "+++ /dev/null",
    `@@ -1,${lines.length} +0,0 @@`,
    body,
  ].join("\n");
};

export const buildModifiedFileUnifiedDiff = (
  oldPath: string,
  newPath: string,
  oldContent: string,
  newContent: string,
): string => createTwoFilesPatch(oldPath, newPath, oldContent, newContent);
