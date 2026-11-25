import { actionBound, computed, observable, reaction } from 'mobx';
import type { GitLabDiscussionDC, GitLabNoteDC } from '@/shared/api/gitlab';
import { isDiscussionResolved } from '@/shared/lib/gitlab/diff-discussions';
import { DiscussionNoteEditor } from '@/shared/lib/gitlab/discussion-note-editor';
import { VM } from '@/shared/lib/view-models/vm';
import type { GitlabMarkdownScope } from '@/shared/ui/gitlab-markdown/model';

interface NoteActions {
  currentUserId?: number | null;
  onUpdateDiscussionNote?: (
    discussionId: string,
    noteId: number,
    body: string,
  ) => Promise<boolean>;
  onDeleteDiscussionNote?: (
    discussionId: string,
    noteId: number,
  ) => Promise<boolean>;
  updatingNoteKey?: string | null;
  deletingNoteKey?: string | null;
  updateNoteError?: string | null;
  deleteNoteErrorKey?: string | null;
  deleteNoteError?: string | null;
  onClearUpdateNoteError?: () => void;
  onClearDeleteNoteError?: () => void;
}

interface DiscussionNoteProps extends NoteActions {
  markdownScope: GitlabMarkdownScope;
  discussionId: string;
  isReply: boolean;
  note: GitLabNoteDC;
}

export class DiscussionNoteVM extends VM<DiscussionNoteProps> {
  readonly editor = new DiscussionNoteEditor(
    () => this.payload,
    this.unmountSignal,
  );
}

export interface DiscussionsProps extends NoteActions {
  markdownScope: GitlabMarkdownScope;
  onResolveDiscussion: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId: string | null;
}

export class DiscussionThreadVM extends VM<
  DiscussionsProps & { discussion: GitLabDiscussionDC }
> {
  @observable accessor expanded = true;

  @computed
  get resolved() {
    return isDiscussionResolved(this.payload.discussion);
  }

  willMount() {
    reaction(
      () => [this.payload.discussion.id, this.resolved] as const,
      ([, resolved]) => {
        this.expanded = !resolved;
      },
      { fireImmediately: true, signal: this.unmountSignal },
    );
  }

  @actionBound
  toggle() {
    this.expanded = !this.expanded;
  }
}
