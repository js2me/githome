import {
  actionBound,
  computed,
  observable,
  observableRef,
  reaction,
  runInAction,
} from 'mobx';
import { createRef } from 'yummies/mobx';
import type { GitLabNoteDC } from '@/shared/api/gitlab';
import type { InlineDiffThread } from '@/shared/lib/gitlab/discussions/diff-discussions';
import { DiscussionNoteEditor } from '@/shared/lib/gitlab/discussions/discussion-note-editor';
import { VM } from '@/shared/lib/view-models/vm';
import type { GitlabMarkdownScope } from '@/shared/ui/gitlab-markdown/model';

interface InlineNoteVMPayload {
  markdownScope?: GitlabMarkdownScope;
  note: GitLabNoteDC;
  discussionId: string;
  isReply?: boolean;
  resolvedBy?: string | null;
  currentUserId?: number | null;
  onUpdateNote?: (
    discussionId: string,
    noteId: number,
    body: string,
  ) => Promise<boolean>;
  onDeleteNote?: (discussionId: string, noteId: number) => Promise<boolean>;
  updatingNoteKey?: string | null;
  deletingNoteKey?: string | null;
  updateNoteError?: string | null;
  deleteNoteErrorKey?: string | null;
  deleteNoteError?: string | null;
  onClearUpdateNoteError?: () => void;
  onClearDeleteNoteError?: () => void;
}

interface DiffThreadVMPayload {
  markdownScope?: GitlabMarkdownScope;
  thread: InlineDiffThread;
  onResolveThread?: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId?: string | null;
  onReplyThread?: (discussionId: string, body: string) => Promise<boolean>;
  replyingDiscussionId?: string | null;
  replyErrorDiscussionId?: string | null;
  replyError?: string | null;
  onClearReplyError?: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  placement?: 'inline' | 'file';
  currentUserId?: number | null;
  onUpdateNote?: (
    discussionId: string,
    noteId: number,
    body: string,
  ) => Promise<boolean>;
  onDeleteNote?: (discussionId: string, noteId: number) => Promise<boolean>;
  updatingNoteKey?: string | null;
  deletingNoteKey?: string | null;
  updateNoteError?: string | null;
  deleteNoteErrorKey?: string | null;
  deleteNoteError?: string | null;
  onClearUpdateNoteError?: () => void;
  onClearDeleteNoteError?: () => void;
}

interface DiffCommentFormVMPayload {
  markdownScope?: GitlabMarkdownScope;
  errorMessage: string | null;
  isSubmitting: boolean;
  rangeLabel?: string | null;
  onCancel: () => void;
  onSubmit: (body: string) => void;
}

export class InlineNoteVM extends VM<InlineNoteVMPayload> {
  readonly editor = new DiscussionNoteEditor(
    () => ({
      ...this.payload,
      onUpdateDiscussionNote: this.payload.onUpdateNote,
      onDeleteDiscussionNote: this.payload.onDeleteNote,
    }),
    this.unmountSignal,
  );
}

export class DiffThreadVM extends VM<DiffThreadVMPayload> {
  @observable private accessor manuallyExpanded = false;
  @observable accessor isReplying = false;
  @observable accessor replyBody = '';

  @computed get expanded() {
    return (
      this.payload.expanded ??
      (!this.payload.thread.resolved || this.manuallyExpanded)
    );
  }

  willMount() {
    reaction(
      () =>
        [
          this.payload.thread.discussionId,
          this.payload.thread.resolved,
        ] as const,
      () => {
        this.manuallyExpanded = false;
      },
      {
        signal: this.unmountSignal,
        equals: (prev, next) => prev[0] === next[0] && prev[1] === next[1],
      },
    );
  }

  @actionBound toggleExpanded() {
    if (this.payload.onToggleExpand) this.payload.onToggleExpand();
    else this.manuallyExpanded = !this.manuallyExpanded;
  }

  @actionBound startReply() {
    this.isReplying = true;
    this.payload.onClearReplyError?.();
  }

  @actionBound cancelReply() {
    this.isReplying = false;
    this.replyBody = '';
    this.payload.onClearReplyError?.();
  }

  @actionBound changeReply(body: string) {
    this.replyBody = body;
    if (
      this.payload.replyErrorDiscussionId ===
        this.payload.thread.discussionId &&
      this.payload.replyError
    )
      this.payload.onClearReplyError?.();
  }

  async submitReply() {
    const { thread, onReplyThread } = this.payload;
    const body = this.replyBody;
    const signal = this.unmountSignal;
    if (!body.trim() || !onReplyThread) return;
    const sent = await onReplyThread(thread.discussionId, body);
    if (
      sent &&
      !signal.aborted &&
      this.payload.thread.discussionId === thread.discussionId &&
      this.replyBody === body
    ) {
      runInAction(() => {
        this.replyBody = '';
        this.isReplying = false;
      });
    }
  }
}

export class DiffCommentFormVM extends VM<DiffCommentFormVMPayload> {
  @observable accessor body = '';
  readonly textareaRef = createRef<HTMLTextAreaElement>({
    onSet: (element) => element.focus(),
  });

  @actionBound setBody(body: string) {
    this.body = body;
  }
}

export class ThreadAvatarVM extends VM<{
  thread: InlineDiffThread;
  onClick: () => void;
}> {
  readonly anchor = createRef<HTMLDivElement>();
  @observableRef accessor position: { top: number; left: number } | null = null;

  @actionBound private updatePosition() {
    const rect = this.anchor.current?.getBoundingClientRect();
    if (rect)
      this.position = { top: rect.top - 8, left: rect.left + rect.width / 2 };
  }

  @actionBound show() {
    this.updatePosition();
    window.addEventListener('scroll', this.updatePosition, true);
    window.addEventListener('resize', this.updatePosition);
  }

  @actionBound hide() {
    this.position = null;
    window.removeEventListener('scroll', this.updatePosition, true);
    window.removeEventListener('resize', this.updatePosition);
  }

  didUnmount() {
    this.hide();
  }
}
