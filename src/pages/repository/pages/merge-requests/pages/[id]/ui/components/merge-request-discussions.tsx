import type { GitLabDiscussionDC, GitLabNoteDC } from "@/shared/api/gitlab";
import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/cn";
import {
  isDiscussionResolvable,
  isDiscussionResolved,
} from "@/shared/lib/gitlab/diff-discussions";
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
  isReply,
}: {
  note: GitLabNoteDC;
  isReply: boolean;
}) => {
  const position = formatPosition(note);
  const authorName = note.author?.name ?? "Unknown";
  const authorUsername = note.author?.username ?? "";

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
        <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
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
        </header>

        {position && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>на</span>
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {position}
            </code>
          </div>
        )}

        <GitLabMarkdown
          text={note.body}
          className="min-w-0 max-w-full text-slate-800 dark:text-slate-300"
          italic={note.system}
        />
      </div>
    </article>
  );
};

const DiscussionThread = ({
  discussion,
  onResolveDiscussion,
  resolvingDiscussionId,
}: {
  discussion: GitLabDiscussionDC;
  onResolveDiscussion: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId: string | null;
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
          <DiscussionNote note={firstNote} isReply={false} />

          {replies.length > 0 && (
            <div className="flex flex-col gap-3 pb-3.5">
              {replies.map((note) => (
                <DiscussionNote key={note.id} note={note} isReply />
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
}: {
  discussions: GitLabDiscussionDC[];
  onResolveDiscussion: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId: string | null;
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
        />
      ))}
    </div>
  );
};
