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

const buildLineKey = (
  path: string,
  side: "old" | "new",
  line: number,
): string => `${path}:${side}:${line}`;

export const getDiffLineKeyForChange = (
  position: GitLabNotePositionDC,
  change: GitLabMergeRequestChangeDC,
): string | null => getDiffLineKeysForChange(position, change)[0] ?? null;

export const getDiffLineKeysForChange = (
  position: GitLabNotePositionDC,
  change: GitLabMergeRequestChangeDC,
): string[] => {
  if (!positionMatchesChange(position, change)) {
    return [];
  }

  const side = getPositionSide(position);
  const rangeStart = position.line_range?.start;
  const rangeEnd = position.line_range?.end;
  const keys = new Set<string>();

  const newLine =
    toLineNumber(position.new_line) ??
    toLineNumber(rangeStart?.new_line) ??
    toLineNumber(rangeEnd?.new_line);
  const oldLine =
    toLineNumber(position.old_line) ??
    toLineNumber(rangeStart?.old_line) ??
    toLineNumber(rangeEnd?.old_line);

  if (side === "new" || (!side && newLine !== null)) {
    if (newLine !== null) {
      keys.add(buildLineKey(change.new_path, "new", newLine));
    }
  }

  if (side === "old" || (!side && oldLine !== null)) {
    if (oldLine !== null) {
      keys.add(buildLineKey(change.old_path, "old", oldLine));
    }
  }

  if (keys.size === 0 && newLine !== null) {
    keys.add(buildLineKey(change.new_path, "new", newLine));
  }

  if (keys.size === 0 && oldLine !== null) {
    keys.add(buildLineKey(change.old_path, "old", oldLine));
  }

  return [...keys];
};

export const getLineKeysFromDiffLine = (
  oldPath: string,
  newPath: string,
  line: DiffDisplayLine,
): string[] => {
  const keys = new Set<string>();

  if (line.type === "add" && line.newLine !== null) {
    keys.add(buildLineKey(newPath, "new", line.newLine));
  } else if (line.type === "delete" && line.oldLine !== null) {
    keys.add(buildLineKey(oldPath, "old", line.oldLine));
  } else if (line.type === "context") {
    if (line.newLine !== null) {
      keys.add(buildLineKey(newPath, "new", line.newLine));
    }
    if (line.oldLine !== null) {
      keys.add(buildLineKey(oldPath, "old", line.oldLine));
    }
  }

  return [...keys];
};

export const getLineKeyFromDiffLine = (
  oldPath: string,
  newPath: string,
  line: DiffDisplayLine,
): string | null => getLineKeysFromDiffLine(oldPath, newPath, line)[0] ?? null;

export const collectThreadsForLine = (
  oldPath: string,
  newPath: string,
  line: DiffDisplayLine,
  threadIndex: Map<string, InlineDiffThread[]>,
): InlineDiffThread[] => {
  const keys = getLineKeysFromDiffLine(oldPath, newPath, line);
  const threads: InlineDiffThread[] = [];
  const seenDiscussionIds = new Set<string>();

  for (const key of keys) {
    for (const thread of threadIndex.get(key) ?? []) {
      if (seenDiscussionIds.has(thread.discussionId)) {
        continue;
      }

      seenDiscussionIds.add(thread.discussionId);
      threads.push(thread);
    }
  }

  return threads;
};

export const getOrphanThreadsForChange = (
  threadIndex: Map<string, InlineDiffThread[]>,
  placedDiscussionIds: ReadonlySet<string>,
): InlineDiffThread[] => {
  const orphans: InlineDiffThread[] = [];
  const seenDiscussionIds = new Set<string>();

  for (const threads of threadIndex.values()) {
    for (const thread of threads) {
      if (
        placedDiscussionIds.has(thread.discussionId) ||
        seenDiscussionIds.has(thread.discussionId)
      ) {
        continue;
      }

      seenDiscussionIds.add(thread.discussionId);
      orphans.push(thread);
    }
  }

  return orphans;
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

    const keys = getDiffLineKeysForChange(anchorNote.position, change);
    if (keys.length === 0) {
      continue;
    }

    const thread = buildInlineThread(discussion);
    if (!thread) {
      continue;
    }

    for (const key of keys) {
      const threads = index.get(key) ?? [];
      if (threads.some((item) => item.discussionId === thread.discussionId)) {
        continue;
      }

      threads.push(thread);
      index.set(key, threads);
    }
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

    const hasLineKey =
      getDiffLineKeysForChange(anchorNote.position, change).length > 0;
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
