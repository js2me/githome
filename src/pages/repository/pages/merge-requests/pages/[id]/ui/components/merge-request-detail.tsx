import type {
  GitLabDiscussionDC,
  GitLabMergeRequestChangeDC,
  GitLabMergeRequestDC,
  GitLabMergeRequestVersionDC,
} from "@/shared/api/gitlab";
import type { CreateDiffCommentInput } from "@/shared/lib/gitlab/diff-comment";
import type { MergeRequestApprovalView } from "@/shared/lib/gitlab/merge-request-approval-view";
import type { MrReviewAction } from "../../model/mr-info";
import { MergeRequestOverview } from "./merge-request-overview";
import { GitLabMarkdown } from "@/shared/ui/gitlab-markdown/gitlab-markdown";
import type { GitlabMarkdownScope } from "@/shared/ui/gitlab-markdown/model";
import { StatusMessage } from "@/shared/ui/status-message";
import { cn } from "@/shared/lib/cn";
import { filterDiscussionsForActivity } from "@/shared/lib/gitlab/diff-discussions";
import { useMemo, useRef, useState, type ReactNode } from "react";
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

export const MergeRequestDetail = ({
  markdownScope,
  mergeRequest,
  jiraLinks,
  changes,
  changesError = null,
  isPreparingDiffs,
  diffRevision,
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
  loadFileImage,
  onResolveDiscussion,
  resolvingDiscussionId,
  resolveDiscussionError,
  onReplyDiscussion,
  replyingDiscussionId,
  replyDiscussionErrorKey,
  replyDiscussionError,
  onClearReplyDiscussionError,
  currentUserId,
  onUpdateDiscussionNote,
  onDeleteDiscussionNote,
  updatingNoteKey,
  deletingNoteKey,
  updateNoteError,
  deleteNoteErrorKey,
  deleteNoteError,
  onClearUpdateNoteError,
  onClearDeleteNoteError,
  approvals,
  reviewActionInProgress,
  reviewActionError,
  onApprove,
  onUnapprove,
  onRequestChanges,
  onCancelRequestChanges,
  diffVersions = [],
  selectedDiffVersionId = null,
  selectedDiffVersion,
  onSelectDiffVersion,
  pipelineCard,
}: {
  markdownScope: GitlabMarkdownScope;
  mergeRequest: GitLabMergeRequestDC;
  jiraLinks: Record<string, string>;
  changes: GitLabMergeRequestChangeDC[];
  changesError?: string | null;
  isPreparingDiffs: boolean;
  diffRevision: string;
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
  loadFileImage?: (filePath: string, ref: string, signal: AbortSignal) => Promise<Blob>;
  onResolveDiscussion: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId: string | null;
  resolveDiscussionError?: string | null;
  onReplyDiscussion: (discussionId: string, body: string) => Promise<boolean>;
  replyingDiscussionId: string | null;
  replyDiscussionErrorKey: string | null;
  replyDiscussionError: string | null;
  onClearReplyDiscussionError: () => void;
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
  approvals: MergeRequestApprovalView;
  reviewActionInProgress: MrReviewAction | null;
  reviewActionError: string | null;
  onApprove: () => void;
  onUnapprove: () => void;
  onRequestChanges: () => void;
  onCancelRequestChanges: () => void;
  diffVersions?: GitLabMergeRequestVersionDC[];
  selectedDiffVersionId?: number | null;
  selectedDiffVersion: GitLabMergeRequestVersionDC | null;
  onSelectDiffVersion: (id: number | null) => void;
  pipelineCard?: ReactNode;
}) => {
  const description = mergeRequest.description ?? "";
  const { activeFile, selectActiveFile, jumpToFile } = useActiveDiffFile(changes, diffRevision);
  const headRef = selectedDiffVersionId === null
    ? mergeRequest.diff_refs?.head_sha
    : selectedDiffVersion?.head_commit_sha;
  const baseRef = selectedDiffVersionId === null
    ? mergeRequest.diff_refs?.base_sha || mergeRequest.diff_refs?.start_sha
    : selectedDiffVersion?.base_commit_sha || selectedDiffVersion?.start_commit_sha;
  const showChangesTree = changes.length > 0;
  const activityDiscussions = useMemo(
    () => filterDiscussionsForActivity(discussions),
    [discussions],
  );
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const activityButton = useRef<HTMLButtonElement>(null);
  const changesHeading = useRef<HTMLHeadingElement>(null);

  const overview = (
    <div className="flex min-w-0 flex-col gap-3">
      {resolveDiscussionError && (
        <StatusMessage error>{resolveDiscussionError}</StatusMessage>
      )}
      <MergeRequestOverview
        mergeRequest={mergeRequest}
        jiraLinks={jiraLinks}
        projectPath={markdownScope.projectPath}
        loadedFiles={changes.length}
        onShowFiles={() => {
          changesHeading.current?.focus({ preventScroll: true });
          changesHeading.current?.scrollIntoView({ block: "start" });
        }}
        onShowComments={() => {
          setActivityExpanded(true);
          activityButton.current?.focus({ preventScroll: true });
          activityButton.current?.scrollIntoView({ block: "start" });
        }}
      >
        {pipelineCard}
      </MergeRequestOverview>
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
    </div>
  );

  const mainContent = (
    <div className="flex min-w-0 flex-col gap-5">
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
            <div className="glass-panel rounded-2xl p-4">
              <GitLabMarkdown
                {...markdownScope}
                text={description}
              />
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <button
          type="button"
          className="m-0 flex scroll-mt-16 items-center gap-2 text-lg font-semibold cursor-pointer bg-transparent border-none p-0 text-left"
          ref={activityButton}
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
            markdownScope={markdownScope}
            discussions={activityDiscussions}
            onResolveDiscussion={onResolveDiscussion}
            resolvingDiscussionId={resolvingDiscussionId}
            currentUserId={currentUserId}
            onUpdateDiscussionNote={onUpdateDiscussionNote}
            onDeleteDiscussionNote={onDeleteDiscussionNote}
            updatingNoteKey={updatingNoteKey}
            deletingNoteKey={deletingNoteKey}
            updateNoteError={updateNoteError}
            deleteNoteErrorKey={deleteNoteErrorKey}
            deleteNoteError={deleteNoteError}
            onClearUpdateNoteError={onClearUpdateNoteError}
            onClearDeleteNoteError={onClearDeleteNoteError}
          />
        )}
      </section>

      <MergeRequestCommentForm
        projectId={markdownScope.projectId}
        canComment={canCommentOnMr}
        isSubmitting={isSubmittingMrComment}
        submitError={submitMrCommentError}
        onSubmit={onSubmitMrComment}
        onClearSubmitError={onClearSubmitMrCommentError}
      />

      <section className="flex flex-col gap-3">
        <h3 ref={changesHeading} tabIndex={-1} className="m-0 flex scroll-mt-16 items-center gap-2 text-lg font-semibold">
          Изменения
          {changes.length > 0 && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {changes.length}
            </span>
          )}
          {diffVersions.length > 1 ? (
            <DiffVersionPicker
              versions={diffVersions}
              selectedVersionId={selectedDiffVersionId}
              onSelectVersion={onSelectDiffVersion}
            />
          ) : selectedDiffVersionId !== null && (
            <button
              className="glass-control rounded-md px-2 py-0.5 text-xs font-medium"
              type="button"
              onClick={() => onSelectDiffVersion(null)}
            >
              К последней версии
            </button>
          )}
        </h3>
        {changesError && <StatusMessage error>{changesError}</StatusMessage>}
        {isPreparingDiffs ? (
          <div className="flex items-center gap-2 py-4 text-sm text-fg-muted" role="status">
            <span
              className="size-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand dark:border-slate-700"
              aria-hidden="true"
            />
            Подготавливаем diff...
          </div>
        ) : (changes.length > 0 || !changesError) && (
          <GitDiff
            key={diffRevision}
            markdownScope={markdownScope}
            changes={changes}
            discussions={discussions}
            canComment={canComment}
            isSubmittingComment={isSubmittingComment}
            submitCommentError={submitCommentError}
            onAddComment={onAddComment}
            onClearSubmitError={onClearSubmitError}
            headBranch={mergeRequest.source_branch ?? null}
            headRef={headRef ?? null}
            baseRef={baseRef ?? null}
            loadFileContent={loadFileContent}
            loadFileImage={loadFileImage}
            onResolveThread={onResolveDiscussion}
            resolvingDiscussionId={resolvingDiscussionId}
            onReplyThread={onReplyDiscussion}
            replyingDiscussionId={replyingDiscussionId}
            replyErrorDiscussionId={replyDiscussionErrorKey}
            replyError={replyDiscussionError}
            onClearReplyError={onClearReplyDiscussionError}
            currentUserId={currentUserId}
            onUpdateDiscussionNote={onUpdateDiscussionNote}
            onDeleteDiscussionNote={onDeleteDiscussionNote}
            updatingNoteKey={updatingNoteKey}
            deletingNoteKey={deletingNoteKey}
            updateNoteError={updateNoteError}
            deleteNoteErrorKey={deleteNoteErrorKey}
            deleteNoteError={deleteNoteError}
            onClearUpdateNoteError={onClearUpdateNoteError}
            onClearDeleteNoteError={onClearDeleteNoteError}
            activeFile={activeFile}
            onActiveFileChange={selectActiveFile}
          />
        )}
      </section>
    </div>
  );

  return (
    <DiffSearchProvider findBarVisibility={showChangesTree ? "always" : "toggle"}>
      <div className="flex flex-col gap-4">
        <ChangesTreeLayout
          changes={changes}
          overview={overview}
          tree={
            showChangesTree ? (
              <ChangesFileTree
                changes={changes}
                discussions={discussions}
                activeFile={activeFile}
                onSelectFile={jumpToFile}
              />
            ) : null
          }
          connector={showChangesTree && <ChangesActiveFileLink activeFile={activeFile} />}
        >
          {mainContent}
        </ChangesTreeLayout>
      </div>
    </DiffSearchProvider>
  );
};
