import type {
  CreateDiffCommentInput,
  GitLabMergeRequestChange,
  GitLabMergeRequestDetail,
  GitLabDiscussion,
} from "@/shared/api/gitlab";
import {
  getMrStateBadgeState,
  mrStateBadgeVariants,
} from "@/shared/ui/mr-state-badge";
import { MergeRequestChanges } from "./merge-request-changes";
import { MergeRequestDiscussions } from "./merge-request-discussions";

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

const getStateLabel = (mergeRequest: GitLabMergeRequestDetail) => {
  if (mergeRequest.draft) {
    return "Draft";
  }

  if (mergeRequest.state === "opened") {
    return "Open";
  }

  if (mergeRequest.state === "merged") {
    return "Merged";
  }

  if (mergeRequest.state === "closed") {
    return "Closed";
  }

  return mergeRequest.state;
};

export const MergeRequestDetail = ({
  mergeRequest,
  changes,
  discussions,
  canComment,
  isSubmittingComment,
  submitCommentError,
  onAddComment,
  onClearSubmitError,
  loadFileContent,
}: {
  mergeRequest: GitLabMergeRequestDetail;
  changes: GitLabMergeRequestChange[];
  discussions: GitLabDiscussion[];
  canComment: boolean;
  isSubmittingComment: boolean;
  submitCommentError: string | null;
  onAddComment: (input: CreateDiffCommentInput) => Promise<boolean>;
  onClearSubmitError: () => void;
  loadFileContent?: (filePath: string, ref: string) => Promise<string>;
}) => {
  const stateKey = mergeRequest.draft ? "draft" : mergeRequest.state;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start gap-2.5">
          <span className="shrink-0 text-[22px] font-bold text-slate-500">
            !{mergeRequest.iid}
          </span>
          <h2 className="m-0 min-w-0 flex-1 text-[22px] leading-snug dark:text-slate-200">
            {mergeRequest.title}
          </h2>
          <span
            className={mrStateBadgeVariants({
              state: getMrStateBadgeState(stateKey),
              size: "md",
            })}
          >
            {getStateLabel(mergeRequest)}
          </span>
          <a
            className="ml-auto shrink-0 rounded-lg bg-orange-50 px-3 py-2 text-[13px] font-semibold text-orange-700 no-underline hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900"
            href={mergeRequest.webUrl}
            target="_blank"
            rel="noreferrer"
          >
            Открыть в GitLab
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[13px] text-slate-600 dark:text-slate-300">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-950">
            {mergeRequest.sourceBranch}
          </span>
          <span className="text-slate-400">→</span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-950">
            {mergeRequest.targetBranch}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-slate-500">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            {mergeRequest.authorAvatarUrl ? (
              <img
                className="h-6 w-6 rounded-full object-cover"
                src={mergeRequest.authorAvatarUrl}
                alt=""
              />
            ) : (
              <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {mergeRequest.authorName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span>{mergeRequest.authorName}</span>
          </div>

          <span>создан {formatDateTime(mergeRequest.createdAt)}</span>
          <span>обновлён {formatDateTime(mergeRequest.updatedAt)}</span>

          {mergeRequest.userNotesCount > 0 && (
            <span>
              {mergeRequest.userNotesCount}{" "}
              {mergeRequest.userNotesCount === 1 ? "комментарий" : "комментариев"}
            </span>
          )}

          {mergeRequest.changesCount > 0 && (
            <span>
              {mergeRequest.changesCount}{" "}
              {mergeRequest.changesCount === 1 ? "файл" : "файлов"}
            </span>
          )}
        </div>

        {(mergeRequest.hasConflicts || mergeRequest.mergeStatus) && (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {mergeRequest.hasConflicts && (
              <span className="rounded-full bg-red-100 px-2 py-1 text-red-700 dark:bg-red-950 dark:text-red-200">
                Есть конфликты
              </span>
            )}
            {mergeRequest.mergeStatus && (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                merge status: {mergeRequest.mergeStatus}
              </span>
            )}
          </div>
        )}

        {mergeRequest.labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {mergeRequest.labels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {mergeRequest.assigneeNames.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-slate-500">Assignees:</span>
            <span>{mergeRequest.assigneeNames.join(", ")}</span>
          </div>
        )}
      </header>

      {mergeRequest.description.trim() && (
        <section className="flex flex-col gap-3">
          <h3 className="m-0 text-lg font-semibold">Описание</h3>
          <div className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed dark:border-slate-800 dark:bg-gray-900 dark:text-slate-200">
            {mergeRequest.description}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="m-0 flex items-center gap-2 text-lg font-semibold">
          Activity
          {discussions.length > 0 && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {discussions.length}
            </span>
          )}
        </h3>
        <MergeRequestDiscussions discussions={discussions} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="m-0 flex items-center gap-2 text-lg font-semibold">
          Changes
          {changes.length > 0 && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {changes.length}
            </span>
          )}
        </h3>
        <MergeRequestChanges
          changes={changes}
          discussions={discussions}
          canComment={canComment}
          isSubmittingComment={isSubmittingComment}
          submitCommentError={submitCommentError}
          onAddComment={onAddComment}
          onClearSubmitError={onClearSubmitError}
          headRef={mergeRequest.diffRefs?.headSha ?? null}
          baseRef={mergeRequest.diffRefs?.baseSha ?? null}
          loadFileContent={loadFileContent}
        />
      </section>
    </div>
  );
};
