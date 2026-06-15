import type { GitLabDiscussion, GitLabNote } from "@/shared/api/gitlab";
import { cn } from "@/shared/lib/cn";
import { StatusMessage } from "@/shared/ui/status-message";

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

const formatPosition = (note: GitLabNote) => {
  if (note.type !== "DiffNote" || !note.position) {
    return null;
  }

  const path = note.position.newPath ?? note.position.oldPath;
  if (!path) {
    return null;
  }

  const line = note.position.newLine ?? note.position.oldLine;
  return line ? `${path}:${line}` : path;
};

const isDiscussionResolved = (discussion: GitLabDiscussion) => {
  const resolvableNotes = discussion.notes.filter((note) => note.resolvable);
  return (
    resolvableNotes.length > 0 &&
    resolvableNotes.every((note) => note.resolved)
  );
};

const AuthorAvatar = ({ note }: { note: GitLabNote }) => {
  if (note.authorAvatarUrl) {
    return (
      <img
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        src={note.authorAvatarUrl}
        alt=""
      />
    );
  }

  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-[13px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      {note.authorName.slice(0, 1).toUpperCase()}
    </div>
  );
};

const DiscussionNote = ({
  note,
  isReply,
}: {
  note: GitLabNote;
  isReply: boolean;
}) => {
  const position = formatPosition(note);

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
            {note.authorName}
          </span>
          <span className="text-[13px] text-slate-500">@{note.authorUsername}</span>
          <time className="text-xs text-slate-400" dateTime={note.createdAt}>
            {formatDateTime(note.createdAt)}
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

        <div
          className={cn(
            "whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 dark:text-slate-300",
            note.system && "italic text-slate-500 dark:text-slate-400",
          )}
        >
          {note.body}
        </div>
      </div>
    </article>
  );
};

const DiscussionThread = ({ discussion }: { discussion: GitLabDiscussion }) => {
  const [firstNote, ...replies] = discussion.notes;
  const resolved = isDiscussionResolved(discussion);

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
        <div className="border-b border-green-200 bg-green-50 px-3.5 py-2 text-xs font-bold text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          Тред разрешён
        </div>
      )}

      <DiscussionNote note={firstNote} isReply={false} />

      {replies.length > 0 && (
        <div className="flex flex-col gap-3 pb-3.5">
          {replies.map((note) => (
            <DiscussionNote key={note.id} note={note} isReply />
          ))}
        </div>
      )}
    </section>
  );
};

export const MergeRequestDiscussions = ({
  discussions,
}: {
  discussions: GitLabDiscussion[];
}) => {
  if (discussions.length === 0) {
    return <StatusMessage>Комментариев пока нет.</StatusMessage>;
  }

  return (
    <div className="flex flex-col gap-3">
      {discussions.map((discussion) => (
        <DiscussionThread key={discussion.id} discussion={discussion} />
      ))}
    </div>
  );
};
