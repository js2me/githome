import { actionBound, observable, runInAction } from 'mobx';
import type { GitLabNoteDC } from '@/shared/api/gitlab';

interface DiscussionNoteActions {
  note: GitLabNoteDC;
  discussionId: string;
  onUpdateDiscussionNote?: (
    discussionId: string,
    noteId: number,
    body: string,
  ) => Promise<boolean>;
  onDeleteDiscussionNote?: (
    discussionId: string,
    noteId: number,
  ) => Promise<boolean>;
  onClearUpdateNoteError?: () => void;
  onClearDeleteNoteError?: () => void;
  updateNoteError?: string | null;
}

export class DiscussionNoteEditor {
  @observable accessor isEditing = false;
  @observable accessor editBody = '';

  constructor(
    private readonly actions: () => DiscussionNoteActions,
    private readonly signal: AbortSignal,
  ) {}

  @actionBound
  start() {
    const { note, onClearUpdateNoteError } = this.actions();
    this.editBody = note.body;
    this.isEditing = true;
    onClearUpdateNoteError?.();
  }

  @actionBound
  cancel() {
    this.isEditing = false;
    this.actions().onClearUpdateNoteError?.();
  }

  @actionBound
  changeBody(body: string) {
    this.editBody = body;
    const { updateNoteError, onClearUpdateNoteError } = this.actions();
    if (updateNoteError) onClearUpdateNoteError?.();
  }

  @actionBound
  async save() {
    const { note, discussionId, onUpdateDiscussionNote } = this.actions();
    const saved = await onUpdateDiscussionNote?.(
      discussionId,
      note.id,
      this.editBody,
    );
    if (!saved || this.signal.aborted) return;
    const current = this.actions();
    if (current.note.id === note.id && current.discussionId === discussionId) {
      runInAction(() => {
        this.isEditing = false;
      });
    }
  }

  @actionBound
  async remove() {
    const {
      note,
      discussionId,
      onDeleteDiscussionNote,
      onClearDeleteNoteError,
    } = this.actions();
    if (
      onDeleteDiscussionNote &&
      window.confirm('Удалить комментарий? Это действие нельзя отменить.')
    ) {
      onClearDeleteNoteError?.();
      await onDeleteDiscussionNote(discussionId, note.id);
    }
  }
}
