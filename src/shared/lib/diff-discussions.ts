import type { GitLabDiscussion, GitLabNote, GitLabNotePosition } from "@/shared/api/gitlab";
import type { DiffDisplayLine } from "@/shared/lib/parse-unified-diff";

export interface InlineDiffThread {
  discussionId: string;
  notes: GitLabNote[];
  resolved: boolean;
}

export const getDiffLineKey = (position: GitLabNotePosition): string | null => {
  if (position.newLine !== null && position.newPath) {
    return `${position.newPath}:new:${position.newLine}`;
  }

  if (position.oldLine !== null && position.oldPath) {
    return `${position.oldPath}:old:${position.oldLine}`;
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

  return null;
};

export const indexDiffDiscussions = (
  discussions: GitLabDiscussion[],
): Map<string, InlineDiffThread[]> => {
  const index = new Map<string, InlineDiffThread[]>();

  for (const discussion of discussions) {
    const anchorNote = discussion.notes.find(
      (note) => note.type === "DiffNote" && note.position,
    );

    if (!anchorNote?.position) {
      continue;
    }

    const key = getDiffLineKey(anchorNote.position);
    if (!key) {
      continue;
    }

    const thread: InlineDiffThread = {
      discussionId: discussion.id,
      notes: discussion.notes.filter((note) => !note.system),
      resolved: discussion.notes.some((note) => note.resolvable && note.resolved),
    };

    const threads = index.get(key) ?? [];
    threads.push(thread);
    index.set(key, threads);
  }

  return index;
};
