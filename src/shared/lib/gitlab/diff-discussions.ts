import type {
  GitLabDiscussionDC,
  GitLabMergeRequestChangeDC,
  GitLabNoteDC,
  GitLabNotePositionDC,
} from "@/shared/api/gitlab";
import type { DiffDisplayLine } from "@/shared/lib/parse-unified-diff";

export interface InlineDiffThread {
  discussionId: string;
  notes: GitLabNoteDC[];
  resolvable: boolean;
  resolved: boolean;
}

export const isDiscussionResolved = (discussion: GitLabDiscussionDC) => {
  const resolvableNotes = discussion.notes.filter((note) => note.resolvable);
  return (
    resolvableNotes.length > 0 &&
    resolvableNotes.every((note) => note.resolved)
  );
};

export const isDiscussionResolvable = (discussion: GitLabDiscussionDC) =>
  discussion.notes.some((note) => note.resolvable);

const normalizeDiffPath = (path: string | null | undefined) =>
  path?.replace(/^b\//, "").replace(/^\//, "") ?? "";

const toLineNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getPositionSide = (
  position: GitLabNotePositionDC,
): "old" | "new" | null => {
  const startType = position.line_range?.start?.type;
  if (startType === "old" || startType === "new") {
    return startType;
  }

  const endType = position.line_range?.end?.type;
  if (endType === "old" || endType === "new") {
    return endType;
  }

  if (position.new_line != null) {
    return "new";
  }

  if (position.old_line != null) {
    return "old";
  }

  return null;
};

export const positionMatchesChange = (
  position: GitLabNotePositionDC,
  change: GitLabMergeRequestChangeDC,
) => {
  const positionPaths = [
    normalizeDiffPath(position.new_path),
    normalizeDiffPath(position.old_path),
  ].filter(Boolean);

  const changePaths = [
    normalizeDiffPath(change.new_path),
    normalizeDiffPath(change.old_path),
  ].filter(Boolean);

  return positionPaths.some((path) => changePaths.includes(path));
};

export const getDiffLineKey = (position: GitLabNotePositionDC): string | null => {
  if (position.new_line != null && position.new_path) {
    return `${normalizeDiffPath(position.new_path)}:new:${position.new_line}`;
  }

  if (position.old_line != null && position.old_path) {
    return `${normalizeDiffPath(position.old_path)}:old:${position.old_line}`;
  }

  return null;
};

export const getDiffLineKeyForChange = (
  position: GitLabNotePositionDC,
  change: GitLabMergeRequestChangeDC,
): string | null => {
  if (!positionMatchesChange(position, change)) {
    return null;
  }

  const side = getPositionSide(position);
  const rangeStart = position.line_range?.start;
  const rangeEnd = position.line_range?.end;

  if (side === "new" || (!side && position.new_line != null)) {
    const line =
      toLineNumber(position.new_line) ??
      toLineNumber(rangeStart?.new_line) ??
      toLineNumber(rangeEnd?.new_line);

    if (line !== null) {
      return `${change.new_path}:new:${line}`;
    }
  }

  if (side === "old" || (!side && position.old_line != null)) {
    const line =
      toLineNumber(position.old_line) ??
      toLineNumber(rangeStart?.old_line) ??
      toLineNumber(rangeEnd?.old_line);

    if (line !== null) {
      return `${change.old_path}:old:${line}`;
    }
  }

  return null;
};

export const getLineKeyFromDiffLine = (
  oldPath: string,
  newPath: string,
  line: DiffDisplayLine,
): string | null => {
  if (line.type === "add" && line.newLine !== null) {
    return `${newPath}:new:${line.newLine}`;
  }

  if (line.type === "delete" && line.oldLine !== null) {
    return `${oldPath}:old:${line.oldLine}`;
  }

  if (line.type === "context" && line.newLine !== null) {
    return `${newPath}:new:${line.newLine}`;
  }

  if (line.type === "context" && line.oldLine !== null) {
    return `${oldPath}:old:${line.oldLine}`;
  }

  return null;
};

const getDiscussionAnchorNote = (discussion: GitLabDiscussionDC) =>
  discussion.notes.find((note) => note.position);

const buildInlineThread = (
  discussion: GitLabDiscussionDC,
): InlineDiffThread | null => {
  const thread: InlineDiffThread = {
    discussionId: discussion.id,
    notes: discussion.notes.filter((note) => !note.system),
    resolvable: isDiscussionResolvable(discussion),
    resolved: isDiscussionResolved(discussion),
  };

  if (thread.notes.length === 0) {
    return null;
  }

  return thread;
};

export const indexDiffDiscussionsForChange = (
  discussions: GitLabDiscussionDC[],
  change: GitLabMergeRequestChangeDC,
): Map<string, InlineDiffThread[]> => {
  const index = new Map<string, InlineDiffThread[]>();

  for (const discussion of discussions) {
    const anchorNote = getDiscussionAnchorNote(discussion);

    if (!anchorNote?.position) {
      continue;
    }

    const key = getDiffLineKeyForChange(anchorNote.position, change);
    if (!key) {
      continue;
    }

    const thread = buildInlineThread(discussion);
    if (!thread) {
      continue;
    }

    const threads = index.get(key) ?? [];
    threads.push(thread);
    index.set(key, threads);
  }

  return index;
};

export const indexDiffDiscussions = (
  discussions: GitLabDiscussionDC[],
): Map<string, InlineDiffThread[]> => {
  const index = new Map<string, InlineDiffThread[]>();

  for (const discussion of discussions) {
    const anchorNote = getDiscussionAnchorNote(discussion);

    if (!anchorNote?.position) {
      continue;
    }

    const key = getDiffLineKey(anchorNote.position);
    if (!key) {
      continue;
    }

    const thread = buildInlineThread(discussion);
    if (!thread) {
      continue;
    }

    const threads = index.get(key) ?? [];
    threads.push(thread);
    index.set(key, threads);
  }

  return index;
};

export const getFileLevelThreadsForChange = (
  discussions: GitLabDiscussionDC[],
  change: GitLabMergeRequestChangeDC,
): InlineDiffThread[] => {
  const threads: InlineDiffThread[] = [];

  for (const discussion of discussions) {
    const anchorNote = getDiscussionAnchorNote(discussion);
    if (!anchorNote?.position) {
      continue;
    }

    if (!positionMatchesChange(anchorNote.position, change)) {
      continue;
    }

    const hasLineKey = Boolean(getDiffLineKeyForChange(anchorNote.position, change));
    if (hasLineKey) {
      continue;
    }

    const thread = buildInlineThread(discussion);
    if (!thread) {
      continue;
    }

    threads.push(thread);
  }

  return threads;
};
