import type { DiffDisplayLine } from "@/shared/lib/parse-unified-diff";

const sha1Hex = async (value: string): Promise<string> => {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-1", data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const buildGitLabLineCode = async (
  filePath: string,
  oldLine: number | null,
  newLine: number | null,
): Promise<string> => {
  const hash = await sha1Hex(filePath);
  return `${hash}_${oldLine ?? ""}_${newLine ?? ""}`;
};

export const getDiffLineSide = (line: DiffDisplayLine): "old" | "new" =>
  line.type === "delete" ? "old" : "new";

export interface GitLabDiffLinePoint {
  oldLine: number | null;
  newLine: number | null;
  type: "old" | "new";
}

export interface GitLabDiffLineRangePayload {
  start: {
    line_code: string;
    type: "old" | "new";
    old_line?: number;
    new_line?: number;
  };
  end: {
    line_code: string;
    type: "old" | "new";
    old_line?: number;
    new_line?: number;
  };
}

const buildLinePointPayload = async (
  filePath: string,
  point: GitLabDiffLinePoint,
) => ({
  line_code: await buildGitLabLineCode(filePath, point.oldLine, point.newLine),
  type: point.type,
  ...(point.oldLine !== null ? { old_line: point.oldLine } : {}),
  ...(point.newLine !== null ? { new_line: point.newLine } : {}),
});

const isGitLabDiffLinePoint = (
  value: GitLabDiffLinePoint | DiffDisplayLine,
): value is GitLabDiffLinePoint =>
  value.type === "old" || value.type === "new";

export const buildGitLabLineRangePayload = async ({
  filePath,
  start,
  end,
}: {
  filePath: string;
  start: GitLabDiffLinePoint | DiffDisplayLine;
  end: GitLabDiffLinePoint | DiffDisplayLine;
}): Promise<GitLabDiffLineRangePayload> => {
  const startPoint: GitLabDiffLinePoint = isGitLabDiffLinePoint(start)
    ? start
    : {
        oldLine: start.oldLine,
        newLine: start.newLine,
        type: getDiffLineSide(start),
      };

  const endPoint: GitLabDiffLinePoint = isGitLabDiffLinePoint(end)
    ? end
    : {
        oldLine: end.oldLine,
        newLine: end.newLine,
        type: getDiffLineSide(end),
      };

  return {
    start: await buildLinePointPayload(filePath, startPoint),
    end: await buildLinePointPayload(filePath, endPoint),
  };
};
