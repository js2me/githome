import type { GitLabNoteDC } from "@/shared/api/gitlab";

export const getDiscussionNoteKey = (
  discussionId: string,
  noteId: number,
): string => `${discussionId}:${noteId}`;

export const canEditGitLabNote = (
  note: GitLabNoteDC,
  currentUserId: number | null,
): boolean => {
  if (note.system) {
    return false;
  }

  if (note.can_update !== undefined) {
    return note.can_update;
  }

  if (currentUserId === null || note.author?.id === undefined) {
    return false;
  }

  return note.author.id === currentUserId;
};
