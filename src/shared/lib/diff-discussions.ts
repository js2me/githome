import type {
  GitLabDiscussion,
  GitLabMergeRequestChange,
  GitLabNote,
  GitLabNotePosition,
} from "@/shared/api/gitlab";
import type { DiffDisplayLine } from "@/shared/lib/parse-unified-diff";

export interface InlineDiffThread {
  discussionId: string;
  notes: GitLabNote[];
  resolvable: boolean;
  resolved: boolean;
}

export const isDiscussionResolved = (discussion: GitLabDiscussion) => {
  const resolvableNotes = discussion.notes.filter((note) => note.resolvable);
  return (
    resolvableNotes.length > 0 &&
    resolvableNotes.every((note) => note.resolved)
  );
};

export const isDiscussionResolvable = (discussion: GitLabDiscussion) =>
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
  position: GitLabNotePosition,
): "old" | "new" | null => {
  const startType = position.lineRange?.start?.type;
  if (startType === "old" || startType === "new") {
    return startType;
  }

  const endType = position.lineRange?.end?.type;
  if (endType === "old" || endType === "new") {
    return endType;
  }

  if (position.newLine !== null) {
    return "new";
  }

  if (position.oldLine !== null) {
    return "old";
  }

  return null;
};

export const positionMatchesChange = (
  position: GitLabNotePosition,
  change: GitLabMergeRequestChange,
) => {
  const positionPaths = [
    normalizeDiffPath(position.newPath),
    normalizeDiffPath(position.oldPath),
  ].filter(Boolean);

  const changePaths = [
    normalizeDiffPath(change.newPath),
    normalizeDiffPath(change.oldPath),
  ].filter(Boolean);

  return positionPaths.some((path) => changePaths.includes(path));
};

export const getDiffLineKey = (position: GitLabNotePosition): string | null => {
  if (position.newLine !== null && position.newPath) {
    return `${normalizeDiffPath(position.newPath)}:new:${position.newLine}`;
  }

  if (position.oldLine !== null && position.oldPath) {
    return `${normalizeDiffPath(position.oldPath)}:old:${position.oldLine}`;
  }

  return null;
};

export const getDiffLineKeyForChange = (
  position: GitLabNotePosition,
  change: GitLabMergeRequestChange,
): string | null => {
  if (!positionMatchesChange(position, change)) {
    return null;
  }

  const side = getPositionSide(position);
  const rangeStart = position.lineRange?.start;
  const rangeEnd = position.lineRange?.end;

  if (side === "new" || (!side && position.newLine !== null)) {
    const line =
      toLineNumber(position.newLine) ??
      toLineNumber(rangeStart?.newLine) ??
      toLineNumber(rangeEnd?.newLine);

    if (line !== null) {
      return `${change.newPath}:new:${line}`;
    }
  }

  if (side === "old" || (!side && position.oldLine !== null)) {
    const line =
      toLineNumber(position.oldLine) ??
      toLineNumber(rangeStart?.oldLine) ??
      toLineNumber(rangeEnd?.oldLine);

    if (line !== null) {
      return `${change.oldPath}:old:${line}`;
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

const getDiscussionAnchorNote = (discussion: GitLabDiscussion) =>
  discussion.notes.find((note) => note.position);

const buildInlineThread = (
  discussion: GitLabDiscussion,
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
  discussions: GitLabDiscussion[],
  change: GitLabMergeRequestChange,
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
  discussions: GitLabDiscussion[],
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
  discussions: GitLabDiscussion[],
  change: GitLabMergeRequestChange,
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
