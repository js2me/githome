import type {
  GitLabDiscussionDC,
  GitLabMergeRequestChangeDC,
  GitLabMergeRequestDC,
  GitLabMergeRequestVersionDC,
} from "@/shared/api/gitlab";
import type { CreateDiffCommentInput } from "@/shared/lib/gitlab/diff-comment";
import type { MergeRequestApprovalView } from "@/shared/lib/gitlab/merge-request-approval-view";
import type { MrReviewAction } from "../../model/mr-info";
import {
  getMrStateBadgeState,
  mrStateBadgeVariants,
} from "@/shared/ui/mr-state-badge";
import { GitLabMarkdown } from "@/shared/ui/gitlab-markdown/gitlab-markdown";
import { GitlabAvatar } from "@/shared/ui/gitlab-avatar/gitlab-avatar";
import { StatusMessage } from "@/shared/ui/status-message";
import { cn } from "@/shared/lib/cn";
import { filterDiscussionsForActivity } from "@/shared/lib/gitlab/diff-discussions";
import { useCallback, useMemo, useState } from "react";
import { ChangesActiveFileLink } from "./changes-active-file-link";
import { ChangesFileTree } from "./changes-file-tree";
import { ChangesTreeLayout } from "./changes-tree-layout";
import { useActiveDiffFile } from "../hooks/use-active-diff-file";
import { DiffSearchProvider } from "@/shared/ui/git-diff/components/diff-search";
import { DiffVersionPicker } from "./diff-version-picker";
import { MergeRequestCommentForm } from "./merge-request-comment-form";
import { MergeRequestDiscussions } from "./merge-request-discussions";
import { MrReviewActions } from "./mr-review-actions";
import { GitDiff } from "@/shared/ui/git-diff";

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

const isDraft = (mergeRequest: GitLabMergeRequestDC) =>
  mergeRequest.draft ?? mergeRequest.work_in_progress ?? false;

const getAuthorName = (mergeRequest: GitLabMergeRequestDC) =>
  mergeRequest.author?.name ?? "Unknown";

const getChangesCount = (mergeRequest: GitLabMergeRequestDC) => {
  const rawCount = mergeRequest.changes_count;
  if (rawCount === undefined || rawCount === null || rawCount === "") {
    return 0;
  }

  const count = Number(rawCount);
  return Number.isFinite(count) ? count : 0;
};

const getAssigneeNames = (mergeRequest: GitLabMergeRequestDC) =>
  (mergeRequest.assignees ?? [])
    .map((assignee) => assignee.name)
    .filter((name): name is string => Boolean(name));

const getStateLabel = (mergeRequest: GitLabMergeRequestDC) => {
  if (isDraft(mergeRequest)) {
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

const CopyIcon = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 4.5h7v9H6z" />
    <path d="M3 11.5v-9h7" />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="text-green-600 dark:text-green-400"
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m3 8.5 3 3 7-7" />
  </svg>
);

const CrossIcon = () => (
  <svg
    className="text-red-600 dark:text-red-400"
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4.5 4.5 11.5 11.5" />
    <path d="M11.5 4.5 4.5 11.5" />
  </svg>
);

const BranchLabel = ({
  branch,
  label,
}: {
  branch: string;
  label: string;
}) => {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const handleCopy = useCallback(async () => {
    setCopyStatus("idle");

    try {
      await navigator.clipboard.writeText(branch);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1200);
    } catch {
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    }
  }, [branch]);

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 py-1 pl-2 pr-1 dark:border-slate-700 dark:bg-slate-950">
      <span className="min-w-0 truncate">{branch}</span>
      <button
        className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-wait dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        type="button"
        aria-label={`Скопировать ${label}`}
        title={
          copyStatus === "copied"
            ? "Скопировано"
            : copyStatus === "failed"
              ? "Не удалось скопировать"
              : `Скопировать ${label}`
        }
        disabled={copyStatus === "copied"}
        onClick={() => {
          void handleCopy();
        }}
      >
        {copyStatus === "copied" ? (
          <CheckIcon />
        ) : copyStatus === "failed" ? (
          <CrossIcon />
        ) : (
          <CopyIcon />
        )}
      </button>
    </span>
  );
};

export const MergeRequestDetail = ({
  mergeRequest,
  changes,
  changesError = null,
  discussions,
  canComment,
  isSubmittingComment,
  submitCommentError,
  onAddComment,
  onClearSubmitError,
  canCommentOnMr,
  isSubmittingMrComment,
  submitMrCommentError,
  onSubmitMrComment,
  onClearSubmitMrCommentError,
  loadFileContent,
  onResolveDiscussion,
  resolvingDiscussionId,
  resolveDiscussionError,
  approvals,
  reviewActionInProgress,
  reviewActionError,
  onApprove,
  onUnapprove,
  onRequestChanges,
  onCancelRequestChanges,
  diffVersions = [],
  selectedDiffVersionId = null,
  onSelectDiffVersion,
}: {
  mergeRequest: GitLabMergeRequestDC;
  changes: GitLabMergeRequestChangeDC[];
  changesError?: string | null;
  discussions: GitLabDiscussionDC[];
  canComment: boolean;
  isSubmittingComment: boolean;
  submitCommentError: string | null;
  onAddComment: (input: CreateDiffCommentInput) => Promise<boolean>;
  onClearSubmitError: () => void;
  canCommentOnMr: boolean;
  isSubmittingMrComment: boolean;
  submitMrCommentError: string | null;
  onSubmitMrComment: (body: string) => Promise<boolean>;
  onClearSubmitMrCommentError: () => void;
  loadFileContent?: (filePath: string, ref: string) => Promise<string>;
  onResolveDiscussion: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId: string | null;
  resolveDiscussionError?: string | null;
  approvals: MergeRequestApprovalView;
  reviewActionInProgress: MrReviewAction | null;
  reviewActionError: string | null;
  onApprove: () => void;
  onUnapprove: () => void;
  onRequestChanges: () => void;
  onCancelRequestChanges: () => void;
  diffVersions?: GitLabMergeRequestVersionDC[];
  selectedDiffVersionId?: number | null;
  onSelectDiffVersion: (id: number | null) => void;
}) => {
  const stateKey = isDraft(mergeRequest) ? "draft" : mergeRequest.state;
  const authorName = getAuthorName(mergeRequest);
  const changesCount = getChangesCount(mergeRequest);
  const assigneeNames = getAssigneeNames(mergeRequest);
  const userNotesCount = mergeRequest.user_notes_count ?? 0;
  const labels = mergeRequest.labels ?? [];
  const description = mergeRequest.description ?? "";
  const { activeFileKey, setActiveFileKey } = useActiveDiffFile(changes);
  const showChangesTree = changes.length > 0;
  const activityDiscussions = useMemo(
    () => filterDiscussionsForActivity(discussions),
    [discussions],
  );
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const mainContent = (
    <div className="flex min-w-0 flex-col gap-5">
      {resolveDiscussionError && (
        <StatusMessage error>{resolveDiscussionError}</StatusMessage>
      )}
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
            href={mergeRequest.web_url}
            target="_blank"
            rel="noreferrer"
          >
            Открыть в GitLab
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[13px] text-slate-600 dark:text-slate-300">
          <BranchLabel branch={mergeRequest.source_branch} label="source branch" />
          <span className="text-slate-400">→</span>
          <BranchLabel branch={mergeRequest.target_branch} label="target branch" />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-slate-500">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <GitlabAvatar
              className="h-6 w-6 rounded-full object-cover"
              avatarUrl={mergeRequest.author?.avatar_url}
              name={authorName}
            />
            <span>{authorName}</span>
          </div>

          <span>создан {formatDateTime(mergeRequest.created_at ?? mergeRequest.updated_at)}</span>
          <span>обновлён {formatDateTime(mergeRequest.updated_at)}</span>

          {userNotesCount > 0 && (
            <span>
              {userNotesCount}{" "}
              {userNotesCount === 1 ? "комментарий" : "комментариев"}
            </span>
          )}

          {changesCount > 0 && (
            <span>
              {changesCount}{" "}
              {changesCount === 1 ? "файл" : "файлов"}
            </span>
          )}
        </div>

        {(mergeRequest.has_conflicts || mergeRequest.merge_status) && (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {mergeRequest.has_conflicts && (
              <span className="rounded-full bg-red-100 px-2 py-1 text-red-700 dark:bg-red-950 dark:text-red-200">
                Есть конфликты
              </span>
            )}
            {mergeRequest.merge_status && (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                merge status: {mergeRequest.merge_status}
              </span>
            )}
          </div>
        )}

        {labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {labels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {assigneeNames.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-slate-500">Assignees:</span>
            <span>{assigneeNames.join(", ")}</span>
          </div>
        )}
      </header>

      <MrReviewActions
        mergeRequest={mergeRequest}
        approvals={approvals}
        reviewActionInProgress={reviewActionInProgress}
        reviewActionError={reviewActionError}
        onApprove={onApprove}
        onUnapprove={onUnapprove}
        onRequestChanges={onRequestChanges}
        onCancelRequestChanges={onCancelRequestChanges}
      />

      {description.trim() && (
        <section className="flex flex-col gap-3">
          <button
            type="button"
            className="m-0 flex items-center gap-2 text-lg font-semibold cursor-pointer bg-transparent border-none p-0 text-left"
            onClick={() => setDescriptionExpanded((v) => !v)}
            aria-expanded={descriptionExpanded}
          >
            <svg
              className={cn("h-4 w-4 shrink-0 transition-transform", descriptionExpanded && "rotate-90")}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6 4l8 6-8 6V4z" />
            </svg>
            Описание
          </button>
          {descriptionExpanded && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-gray-900">
              <GitLabMarkdown text={description} />
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <button
          type="button"
          className="m-0 flex items-center gap-2 text-lg font-semibold cursor-pointer bg-transparent border-none p-0 text-left"
          onClick={() => setActivityExpanded((v) => !v)}
          aria-expanded={activityExpanded}
        >
          <svg
            className={cn("h-4 w-4 shrink-0 transition-transform", activityExpanded && "rotate-90")}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M6 4l8 6-8 6V4z" />
          </svg>
          Активность
          {activityDiscussions.length > 0 && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {activityDiscussions.length}
            </span>
          )}
        </button>
        {activityExpanded && (
          <MergeRequestDiscussions
            discussions={activityDiscussions}
            onResolveDiscussion={onResolveDiscussion}
            resolvingDiscussionId={resolvingDiscussionId}
          />
        )}
      </section>

      <MergeRequestCommentForm
        canComment={canCommentOnMr}
        isSubmitting={isSubmittingMrComment}
        submitError={submitMrCommentError}
        onSubmit={onSubmitMrComment}
        onClearSubmitError={onClearSubmitMrCommentError}
      />

      <section className="flex flex-col gap-3">
        <h3 className="m-0 flex items-center gap-2 text-lg font-semibold">
          Changes
          {changes.length > 0 && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {changes.length}
            </span>
          )}
          {diffVersions.length > 1 && (
            <DiffVersionPicker
              versions={diffVersions}
              selectedVersionId={selectedDiffVersionId}
              onSelectVersion={onSelectDiffVersion}
            />
          )}
        </h3>
        {changesError && <StatusMessage error>{changesError}</StatusMessage>}
        <GitDiff
          changes={changes}
          discussions={discussions}
          canComment={canComment}
          isSubmittingComment={isSubmittingComment}
          submitCommentError={submitCommentError}
          onAddComment={onAddComment}
          onClearSubmitError={onClearSubmitError}
          headRef={mergeRequest.diff_refs?.head_sha ?? null}
          baseRef={
            mergeRequest.diff_refs?.start_sha ??
            mergeRequest.diff_refs?.base_sha ??
            null
          }
          loadFileContent={loadFileContent}
          onResolveThread={onResolveDiscussion}
          resolvingDiscussionId={resolvingDiscussionId}
          activeFileKey={activeFileKey}
          onActiveFileChange={setActiveFileKey}
        />
      </section>
    </div>
  );

  if (!showChangesTree) {
    return mainContent;
  }

  return (
    <DiffSearchProvider findBarVisibility="always">
      <div className="flex flex-col gap-4">
        <ChangesTreeLayout
          changes={changes}
          tree={
            <ChangesFileTree
              changes={changes}
              discussions={discussions}
              activeFileKey={activeFileKey}
              onActiveFileChange={setActiveFileKey}
            />
          }
          connector={<ChangesActiveFileLink activeFileKey={activeFileKey} />}
        >
          {mainContent}
        </ChangesTreeLayout>
      </div>
    </DiffSearchProvider>
  );
};
