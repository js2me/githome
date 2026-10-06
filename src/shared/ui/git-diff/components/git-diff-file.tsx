import { useEffect, useRef, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { getDiffFileElementId, getDiffFileHeaderRowId } from "@/shared/lib/diff-search";
import { cn } from "@/shared/lib/cn";
import { cva } from "yummies/css";
import { GitlabCommentEditor } from "@/shared/ui/gitlab-comment-editor";
import type { FileGitDiff } from "../model/file-git-diff";
import { DiffFileCollapseBanner } from "./diff-file-collapse-banner";
import { DiffThreadRow } from "./diff-rows";
import {
  SearchHighlightedText,
  useDiffSearchRegistrationOptional,
  useRowSearchHighlight,
} from "./diff-search";
import { DiffSyntaxHighlightProvider } from "./diff-syntax-highlight";
import { DiffBody } from "./virtual-diff-body";
import { DiffFileCopyButton } from "./diff-file-copy-button";
import { CopyContentIcon } from "./icons/copy-content-icon";
import { CopyNameIcon } from "./icons/copy-name-icon";
import { CopyPathIcon } from "./icons/copy-path-icon";

const getFileNameFromPath = (path: string) => path.split("/").pop() ?? path;

const buildFilesHref = ({
  projectId,
  commit,
  branch,
  filePath,
}: {
  projectId: number;
  commit: string;
  branch?: string | null;
  filePath: string;
}) => {
  const query = new URLSearchParams();
  if (branch) {
    query.set("branch", branch);
  }
  query.set("commit", commit);
  query.set("file", filePath);
  return `/repository/${projectId}/files?${query.toString()}`;
};

const diffFileBadgeVariants = cva(
  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
  {
    variants: {
      badge: {
        new: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
        deleted: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
        renamed: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      },
    },
  },
);

const diffFileHeaderTextButtonVariants = cva(
  "inline-flex h-7 cursor-pointer items-center rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800",
);

const FileCommentForm = ({
  model,
  isSubmitting,
  submitError,
}: {
  model: FileGitDiff;
  isSubmitting: boolean;
  submitError: string | null;
}) => {
  const { comments, parent } = model;
  const { markdownScope } = parent.payload;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  const syncSubmitDisabled = useCallback(() => {
    const button = submitButtonRef.current;
    const textarea = textareaRef.current;
    if (!button || !textarea) {
      return;
    }

    button.disabled = isSubmitting || !textarea.value.trim();
  }, [isSubmitting]);

  useEffect(() => {
    syncSubmitDisabled();
  }, [isSubmitting, syncSubmitDisabled]);

  return (
    <div className="border-b border-slate-200 bg-orange-50 px-3.5 py-3 dark:border-[var(--color-border-default)] dark:bg-orange-950">
      <div className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
        Комментарий к файлу
      </div>
      <GitlabCommentEditor
        inputRef={textareaRef}
        projectId={markdownScope?.projectId ?? null}
        editorClassName="border-orange-300 dark:border-orange-800"
        placeholder="Оставьте комментарий к файлу"
        defaultValue=""
        onInput={syncSubmitDisabled}
        disabled={isSubmitting}
      />
      {submitError && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-300">
          {submitError}
        </div>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800"
          type="button"
          disabled={isSubmitting}
          onClick={comments.cancelFileComment}
        >
          Отмена
        </button>
        <button
          ref={submitButtonRef}
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled
          onClick={() => {
            void comments.submitFileComment(textareaRef.current?.value ?? "");
          }}
        >
          Отправить
        </button>
      </div>
    </div>
  );
};

export const GitDiffFile = observer(({ model }: { model: FileGitDiff }) => {
  const {
    meta,
    content,
    rows,
    comments,
    navigation,
    parent: { payload },
  } = model;

  const {
    change,
    fileKey,
    badge,
    filePath,
    isCollapsible,
    isDiffContentHidden,
    fileThreads,
    searchFilePath,
    isActive,
    additions,
    deletions,
    isLazyCollapsed,
    reservedBodyMinHeight,
  } = meta;

  const {
    isFileExpanded,
    collapsedExpandError,
    isLoadingCollapsedExpand,
    isResolvingDiff,
    parsed,
    showTooLargeBanner,
  } = content;

  const {
    virtualRows,
    searchLines,
    includeCodeLinesInSearch,
  } = rows;
  const { isFileCommentOpen } = comments;

  const {
    canComment,
    onResolveThread,
    resolvingDiscussionId,
    onReplyThread,
    replyingDiscussionId,
    replyErrorDiscussionId,
    replyError,
    onClearReplyError,
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
    markdownScope,
    headBranch,
    isSubmittingComment,
    submitCommentError,
  } = payload;

  const openInFilesHref =
    markdownScope?.projectId && meta.fileRef && meta.filePath
      ? buildFilesHref({
          projectId: markdownScope.projectId,
          commit: meta.fileRef,
          branch: headBranch ?? null,
          filePath: meta.filePath,
        })
      : null;

  const searchRegistration = useDiffSearchRegistrationOptional();
  const registerFile = searchRegistration?.registerFile;
  const unregisterFile = searchRegistration?.unregisterFile;
  const headerRowId = getDiffFileHeaderRowId(fileKey);
  const headerSearchHighlight = useRowSearchHighlight(headerRowId);

  useEffect(() => {
    if (!registerFile || !unregisterFile) {
      return;
    }

    registerFile(
      fileKey,
      searchFilePath,
      includeCodeLinesInSearch ? searchLines : [],
      (rowId) => {
        navigation.scrollToRow(rowId);
      },
    );

    return () => unregisterFile(fileKey);
  }, [
    registerFile,
    unregisterFile,
    fileKey,
    searchFilePath,
    searchLines,
    includeCodeLinesInSearch,
    navigation,
  ]);

  const renderDiffContent = () => {
    if (showTooLargeBanner) {
      return (
        <DiffFileCollapseBanner
          change={change}
          isLoading={false}
          onExpand={() => undefined}
        />
      );
    }

    if (isDiffContentHidden) {
      return (
        <DiffFileCollapseBanner
          change={change}
          isLoading={isLoadingCollapsedExpand}
          onExpand={() => {
            void content.expandCollapsedFile();
          }}
        />
      );
    }

    if (parsed && virtualRows.length > 0) {
      return (
        <DiffSyntaxHighlightProvider
          globals={model.parent.globals}
          change={change}
          parsed={parsed}
        >
          <DiffBody fileGitDiff={model} />
        </DiffSyntaxHighlightProvider>
      );
    }

    if (isLazyCollapsed && !parsed) {
      return (
        <div className="flex items-center gap-3 p-3.5 text-[13px] text-slate-500">
          <span>
            {collapsedExpandError
              ? `Не удалось загрузить diff: ${collapsedExpandError}`
              : "Загружаем diff..."}
          </span>
          {collapsedExpandError && (
            <button
              type="button"
              className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              disabled={isLoadingCollapsedExpand}
              onClick={() => void content.expandCollapsedFile()}
            >
              Повторить
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="p-3.5 text-[13px] text-slate-500">
        {isResolvingDiff || isLoadingCollapsedExpand
          ? "Загружаем diff..."
          : "Нет diff для этого файла."}
      </div>
    );
  };

  return (
    <article
      id={getDiffFileElementId(fileKey)}
      className={cn(
        "w-full min-w-0 rounded-lg border bg-white dark:bg-gray-900",
        isActive
          ? "border-accent-blue ring-2 ring-[var(--color-accent-blue-ring)] dark:border-accent-blue"
          : "border-[var(--diff-border)]",
      )}
      onClickCapture={(event) => {
        const target = event.target as HTMLElement;
        if (
          target.closest("button, a, input, textarea, select, label")
        ) {
          return;
        }

        navigation.setActive();
      }}
    >
      <header className="sticky top-0 z-20 flex items-center gap-2.5 rounded-t-lg border-b border-[var(--diff-border)] bg-[var(--diff-header-bg)] px-3.5 py-2.5">
        {isCollapsible && (
          <button
            className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--color-fg-subtle)] transition hover:bg-[var(--color-accent-emphasis-hover)] dark:text-[var(--color-fg-muted)] dark:hover:bg-[var(--color-canvas-muted)]"
            type="button"
            title={isFileExpanded ? "Свернуть файл" : "Развернуть файл"}
            aria-label={isFileExpanded ? "Свернуть файл" : "Развернуть файл"}
            onClick={content.toggleFileExpanded}
          >
            <svg
              aria-hidden="true"
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                isFileExpanded && "rotate-90",
              )}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-0.5">
          <span className="min-w-0 truncate font-mono text-[13px] text-[var(--diff-code-text)]">
            {headerSearchHighlight.ranges.length > 0 ? (
              <SearchHighlightedText
                text={searchFilePath}
                ranges={headerSearchHighlight.ranges}
                activeRange={headerSearchHighlight.activeRange}
              />
            ) : (
              searchFilePath
            )}
          </span>
          <div className="flex shrink-0 items-center">
            <DiffFileCopyButton
              compact
              label="копировать путь"
              icon={<CopyPathIcon />}
              getValue={() => filePath}
            />
            <DiffFileCopyButton
              compact
              label="копировать имя"
              icon={<CopyNameIcon />}
              getValue={() => getFileNameFromPath(filePath)}
            />
          </div>
        </div>

        {additions > 0 || deletions > 0 ? (
          <span className="flex shrink-0 items-center gap-2 font-mono text-xs font-bold">
            {additions > 0 && (
              <span className="text-[var(--diff-stats-added)]">
                +{additions}
              </span>
            )}
            {deletions > 0 && (
              <span className="text-[var(--diff-stats-removed)]">
                −{deletions}
              </span>
            )}
          </span>
        ) : null}

        {badge && (
          <span className={diffFileBadgeVariants({ badge })}>
            {badge}
          </span>
        )}

        <div className="ml-2 flex shrink-0 items-center">
          <DiffFileCopyButton
            label="копировать содержимое"
            icon={<CopyContentIcon />}
            getValue={content.copyFileContent}
          />
          {openInFilesHref && (
            <a
              className={cn(diffFileHeaderTextButtonVariants(), "ml-2 no-underline")}
              href={openInFilesHref}
              title="Открыть файл в Files"
            >
              открыть в files
            </a>
          )}
        </div>

        {canComment && (
          <button
            className={diffFileHeaderTextButtonVariants()}
            type="button"
            onClick={comments.toggleFileCommentOpen}
          >
            {isFileCommentOpen ? "Скрыть комментарий" : "Комментарий к файлу"}
          </button>
        )}
      </header>

      {isFileCommentOpen && (
        <FileCommentForm
          model={model}
          isSubmitting={isSubmittingComment}
          submitError={submitCommentError}
        />
      )}

      {fileThreads.length > 0 && (
        <div className="border-b border-slate-200 dark:border-[var(--color-border-default)]">
          {fileThreads.map((thread) => (
            <DiffThreadRow
              key={`file-thread:${thread.discussionId}`}
              thread={thread}
              onResolveThread={onResolveThread}
              resolvingDiscussionId={resolvingDiscussionId}
              onReplyThread={onReplyThread}
              replyingDiscussionId={replyingDiscussionId}
              replyErrorDiscussionId={replyErrorDiscussionId}
              replyError={replyError}
              onClearReplyError={onClearReplyError}
              placement="file"
              currentUserId={currentUserId}
              onUpdateNote={onUpdateDiscussionNote}
              onDeleteNote={onDeleteDiscussionNote}
              updatingNoteKey={updatingNoteKey}
              deletingNoteKey={deletingNoteKey}
              updateNoteError={updateNoteError}
              deleteNoteErrorKey={deleteNoteErrorKey}
              deleteNoteError={deleteNoteError}
              onClearUpdateNoteError={onClearUpdateNoteError}
              onClearDeleteNoteError={onClearDeleteNoteError}
              markdownScope={markdownScope}
            />
          ))}
        </div>
      )}

      <div className="git-diff-body-scroll">
        <div
          className="w-max min-w-full"
          style={reservedBodyMinHeight ? { minHeight: reservedBodyMinHeight } : undefined}
        >
          {renderDiffContent()}
        </div>
      </div>
    </article>
  );
});
