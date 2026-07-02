import { useEffect } from "react";
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
    isAutoCollapsed,
    fileThreads,
    searchFilePath,
    isActive,
    additions,
    deletions,
  } = meta;

  const {
    isFileExpanded,
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
  const { isFileCommentOpen, fileCommentBody } = comments;

  const {
    canComment,
    isSubmittingComment,
    submitCommentError,
    onResolveThread,
    resolvingDiscussionId,
    currentUserId,
    onUpdateDiscussionNote,
    updatingNoteKey,
    updateNoteError,
    onClearUpdateNoteError,
    markdownScope,
  } = payload;

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

    if (isAutoCollapsed && !isFileExpanded) {
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
        <DiffSyntaxHighlightProvider change={change} parsed={parsed}>
          <DiffBody fileGitDiff={model} />
        </DiffSyntaxHighlightProvider>
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
        "w-max min-w-full rounded-lg border bg-white dark:bg-gray-900",
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
      <header className="sticky top-0 z-10 flex items-center gap-2.5 rounded-t-lg border-b border-[var(--diff-border)] bg-[var(--diff-header-bg)] px-3.5 py-2.5">
        {isAutoCollapsed && (
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
        <div className="border-b border-slate-200 bg-orange-50 px-3.5 py-3 dark:border-[var(--color-border-default)] dark:bg-orange-950">
          <div className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
            Комментарий к файлу
          </div>
          <GitlabCommentEditor
            projectId={markdownScope?.projectId ?? null}
            editorClassName="border-orange-300 dark:border-orange-800"
            placeholder="Оставьте комментарий к файлу"
            value={fileCommentBody}
            disabled={isSubmittingComment}
            onChange={comments.setFileCommentBody}
          />
          {submitCommentError && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-300">
              {submitCommentError}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800"
              type="button"
              disabled={isSubmittingComment}
              onClick={comments.cancelFileComment}
            >
              Отмена
            </button>
            <button
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={isSubmittingComment || !fileCommentBody.trim()}
              onClick={comments.submitFileComment}
            >
              Отправить
            </button>
          </div>
        </div>
      )}

      {fileThreads.length > 0 && (
        <div className="border-b border-slate-200 dark:border-[var(--color-border-default)]">
          {fileThreads.map((thread) => (
            <DiffThreadRow
              key={`file-thread:${thread.discussionId}`}
              thread={thread}
              onResolveThread={onResolveThread}
              resolvingDiscussionId={resolvingDiscussionId}
              placement="file"
              currentUserId={currentUserId}
              onUpdateNote={onUpdateDiscussionNote}
              updatingNoteKey={updatingNoteKey}
              updateNoteError={updateNoteError}
              onClearUpdateNoteError={onClearUpdateNoteError}
              markdownScope={markdownScope}
            />
          ))}
        </div>
      )}

      {renderDiffContent()}
    </article>
  );
});
