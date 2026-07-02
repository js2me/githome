import type { GitLabDiscussionDC, GitLabNoteDC } from "@/shared/api/gitlab";
import { Pencil } from "@gravity-ui/icons";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/shared/lib/cn";
import {
  isDiscussionResolvable,
  isDiscussionResolved,
} from "@/shared/lib/gitlab/diff-discussions";
import {
  canEditGitLabNote,
  getDiscussionNoteKey,
} from "@/shared/lib/gitlab/note-permissions";
import { GitLabMarkdown } from "@/shared/ui/gitlab-markdown/gitlab-markdown";
import { GitlabAvatar } from "@/shared/ui/gitlab-avatar/gitlab-avatar";
import { StatusMessage } from "@/shared/ui/status-message";
import { DiscussionResolveActions } from "./discussion-resolve-actions";

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPosition = (note: GitLabNoteDC) => {
  if (note.type !== "DiffNote" || !note.position) {
    return null;
  }

  const path = note.position.new_path ?? note.position.old_path;
  if (!path) {
    return null;
  }

  const line = note.position.new_line ?? note.position.old_line;
  return line ? `${path}:${line}` : path;
};

const isDiscussionResolvedState = isDiscussionResolved;

const AuthorAvatar = ({ note }: { note: GitLabNoteDC }) => {
  const authorName = note.author?.name ?? "Unknown";

  return (
    <GitlabAvatar
      className="h-8 w-8 shrink-0 rounded-full object-cover"
      avatarUrl={note.author?.avatar_url}
      name={authorName}
    />
  );
};

const DiscussionNote = ({
  note,
  discussionId,
  isReply,
  currentUserId = null,
  onUpdateDiscussionNote,
  updatingNoteKey = null,
  updateNoteError = null,
  onClearUpdateNoteError,
}: {
  note: GitLabNoteDC;
  discussionId: string;
  isReply: boolean;
  currentUserId?: number | null;
  onUpdateDiscussionNote?: (
    discussionId: string,
    noteId: number,
    body: string,
  ) => Promise<boolean>;
  updatingNoteKey?: string | null;
  updateNoteError?: string | null;
  onClearUpdateNoteError?: () => void;
}) => {
  const position = formatPosition(note);
  const authorName = note.author?.name ?? "Unknown";
  const authorUsername = note.author?.username ?? "";
  const canEdit = canEditGitLabNote(note, currentUserId);
  const noteKey = getDiscussionNoteKey(discussionId, note.id);
  const isSaving = updatingNoteKey === noteKey;
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(note.body);

  useEffect(() => {
    if (!isEditing) {
      setEditBody(note.body);
    }
  }, [isEditing, note.body]);

  const handleStartEdit = useCallback(() => {
    setEditBody(note.body);
    setIsEditing(true);
    onClearUpdateNoteError?.();
  }, [note.body, onClearUpdateNoteError]);

  const handleCancelEdit = useCallback(() => {
    setEditBody(note.body);
    setIsEditing(false);
    onClearUpdateNoteError?.();
  }, [note.body, onClearUpdateNoteError]);

  const handleSaveEdit = useCallback(async () => {
    if (!onUpdateDiscussionNote) {
      return;
    }

    const success = await onUpdateDiscussionNote(discussionId, note.id, editBody);
    if (success) {
      setIsEditing(false);
    }
  }, [discussionId, editBody, note.id, onUpdateDiscussionNote]);

  return (
    <article
      className={cn(
        "flex gap-3 px-4 py-3.5",
        note.system && "bg-slate-50 dark:bg-slate-950",
        isReply && "pb-3.5 pl-[52px] pt-0",
      )}
    >
      <AuthorAvatar note={note} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <header className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-200">
              {authorName}
            </span>
            {authorUsername && (
              <span className="text-[13px] text-slate-500">@{authorUsername}</span>
            )}
            <time className="text-xs text-slate-400" dateTime={note.created_at}>
              {formatDateTime(note.created_at)}
            </time>
            {note.resolvable && note.resolved && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold uppercase text-green-800 dark:bg-green-950 dark:text-green-300">
                Resolved
              </span>
            )}
          </div>

          {canEdit && onUpdateDiscussionNote && !isEditing && (
            <button
              className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              type="button"
              title="Редактировать"
              aria-label="Редактировать комментарий"
              disabled={Boolean(updatingNoteKey)}
              onClick={handleStartEdit}
            >
              <Pencil width={14} height={14} />
            </button>
          )}
        </header>

        {position && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>на</span>
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {position}
            </code>
          </div>
        )}

        {isEditing ? (
          <div>
            <textarea
              className="min-h-[72px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-focus-shadow)] disabled:opacity-60 dark:border-slate-700 dark:bg-canvas-default dark:text-slate-200"
              value={editBody}
              onChange={(event) => {
                setEditBody(event.target.value);
                if (updateNoteError) {
                  onClearUpdateNoteError?.();
                }
              }}
              rows={3}
              disabled={isSaving}
            />

            {updateNoteError && isEditing && (
              <div className="mt-2 text-[13px] text-red-700 dark:text-red-300">
                {updateNoteError}
              </div>
            )}

            <div className="mt-2.5 flex gap-2">
              <button
                className="cursor-pointer rounded-lg border border-brand bg-brand px-3.5 py-2 text-[13px] font-semibold text-white enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={isSaving || !editBody.trim()}
                onClick={() => {
                  void handleSaveEdit();
                }}
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
              <button
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-gray-900 dark:text-slate-200 dark:enabled:hover:bg-slate-800"
                type="button"
                disabled={isSaving}
                onClick={handleCancelEdit}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <GitLabMarkdown
            text={note.body}
            className="min-w-0 max-w-full text-slate-800 dark:text-slate-300"
            italic={note.system}
          />
        )}
      </div>
    </article>
  );
};

const DiscussionThread = ({
  discussion,
  onResolveDiscussion,
  resolvingDiscussionId,
  currentUserId,
  onUpdateDiscussionNote,
  updatingNoteKey,
  updateNoteError,
  onClearUpdateNoteError,
}: {
  discussion: GitLabDiscussionDC;
  onResolveDiscussion: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId: string | null;
  currentUserId?: number | null;
  onUpdateDiscussionNote?: (
    discussionId: string,
    noteId: number,
    body: string,
  ) => Promise<boolean>;
  updatingNoteKey?: string | null;
  updateNoteError?: string | null;
  onClearUpdateNoteError?: () => void;
}) => {
  const [firstNote, ...replies] = discussion.notes;
  const resolved = isDiscussionResolvedState(discussion);
  const resolvable = isDiscussionResolvable(discussion);
  const [expanded, setExpanded] = useState(() => !resolved);

  useEffect(() => {
    setExpanded(!resolved);
  }, [discussion.id, resolved]);

  if (!firstNote) {
    return null;
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gray-900",
        resolved && "border-green-200 dark:border-green-900",
      )}
    >
      {resolved && (
        <div className="flex items-center justify-between gap-3 border-b border-green-200 bg-green-50 px-3.5 py-2 text-xs font-bold text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          <span>Тред разрешён</span>
          <button
            className="cursor-pointer rounded-md border border-green-200 bg-white px-2 py-1 text-[11px] font-semibold text-green-800 transition hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900"
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Скрыть" : "Показать"}
          </button>
        </div>
      )}

      {expanded && (
        <>
          <DiscussionNote
            note={firstNote}
            discussionId={discussion.id}
            isReply={false}
            currentUserId={currentUserId}
            onUpdateDiscussionNote={onUpdateDiscussionNote}
            updatingNoteKey={updatingNoteKey}
            updateNoteError={updateNoteError}
            onClearUpdateNoteError={onClearUpdateNoteError}
          />

          {replies.length > 0 && (
            <div className="flex flex-col gap-3 pb-3.5">
              {replies.map((note) => (
                <DiscussionNote
                  key={note.id}
                  note={note}
                  discussionId={discussion.id}
                  isReply
                  currentUserId={currentUserId}
                  onUpdateDiscussionNote={onUpdateDiscussionNote}
                  updatingNoteKey={updatingNoteKey}
                  updateNoteError={updateNoteError}
                  onClearUpdateNoteError={onClearUpdateNoteError}
                />
              ))}
            </div>
          )}

          <DiscussionResolveActions
            discussionId={discussion.id}
            resolved={resolved}
            resolvable={resolvable}
            isResolving={resolvingDiscussionId === discussion.id}
            onResolve={onResolveDiscussion}
            className="border-t border-slate-200 px-4 py-3 dark:border-slate-800"
          />
        </>
      )}
    </section>
  );
};

export const MergeRequestDiscussions = ({
  discussions,
  onResolveDiscussion,
  resolvingDiscussionId,
  currentUserId,
  onUpdateDiscussionNote,
  updatingNoteKey,
  updateNoteError,
  onClearUpdateNoteError,
}: {
  discussions: GitLabDiscussionDC[];
  onResolveDiscussion: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId: string | null;
  currentUserId?: number | null;
  onUpdateDiscussionNote?: (
    discussionId: string,
    noteId: number,
    body: string,
  ) => Promise<boolean>;
  updatingNoteKey?: string | null;
  updateNoteError?: string | null;
  onClearUpdateNoteError?: () => void;
}) => {
  if (discussions.length === 0) {
    return <StatusMessage>Комментариев пока нет.</StatusMessage>;
  }

  return (
    <div className="flex flex-col gap-3">
      {discussions.map((discussion) => (
        <DiscussionThread
          key={discussion.id}
          discussion={discussion}
          onResolveDiscussion={onResolveDiscussion}
          resolvingDiscussionId={resolvingDiscussionId}
          currentUserId={currentUserId}
          onUpdateDiscussionNote={onUpdateDiscussionNote}
          updatingNoteKey={updatingNoteKey}
          updateNoteError={updateNoteError}
          onClearUpdateNoteError={onClearUpdateNoteError}
        />
      ))}
    </div>
  );
};
