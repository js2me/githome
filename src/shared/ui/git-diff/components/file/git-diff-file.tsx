import { Check } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { Link } from 'mobx-route/react';
import type { CSSProperties } from 'react';
import { cva } from 'yummies/css';
import { cn } from '@/shared/lib/cn';
import {
  codeFontSizeKey,
  wrapSourceCodeKey,
} from '@/shared/lib/code-view-preferences';
import {
  getDiffFileElementId,
  getDiffFileHeaderRowId,
} from '@/shared/lib/diff/diff-search';
import { t } from '@/shared/lib/i18n';
import type { FileGitDiff } from '../../model/file-git-diff';
import { DiffThreadRow } from '../diff-rows';
import { SearchHighlightedText, useRowSearchHighlight } from '../diff-search';
import { DiffSyntaxHighlightProvider } from '../diff-syntax-highlight';
import { CopyContentIcon } from '../icons/copy-content-icon';
import { CopyNameIcon } from '../icons/copy-name-icon';
import { CopyPathIcon } from '../icons/copy-path-icon';
import { DiffImages } from '../images/diff-images';
import { DiffBody } from '../virtual-diff-body';
import { DiffFileCollapseBanner } from './diff-file-collapse-banner';
import { DiffFileCopyButton } from './diff-file-copy-button';
import { FileCommentForm } from './file-comment-form';

const getFileNameFromPath = (path: string) => path.split('/').pop() ?? path;

const buildFilesHref = ({
  projectId,
  commit,
  branch,
  filePath,
  mergeRequestIid,
}: {
  projectId: number;
  commit: string;
  branch?: string | null;
  filePath: string;
  mergeRequestIid?: number;
}) => {
  const query = new URLSearchParams();
  if (branch) {
    query.set('branch', branch);
  }
  query.set('commit', commit);
  query.set('file', filePath);
  if (mergeRequestIid !== undefined) {
    query.set('fromMr', String(mergeRequestIid));
  }
  return `/repository/${projectId}/files?${query.toString()}`;
};

const diffFileBadgeVariants = cva(
  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase',
  {
    variants: {
      badge: {
        new: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
        deleted: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
        renamed:
          'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      },
    },
  },
);

const diffFileHeaderTextButtonVariants = cva(
  'glass-control inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold',
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

  const { virtualRows } = rows;
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
          mergeRequestIid: payload.mergeRequestIid,
        })
      : null;

  const headerRowId = getDiffFileHeaderRowId(fileKey);
  const headerSearchHighlight = useRowSearchHighlight(headerRowId);

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
        <DiffSyntaxHighlightProvider highlighting={model.highlighting}>
          <DiffBody fileGitDiff={model} />
        </DiffSyntaxHighlightProvider>
      );
    }

    if (isLazyCollapsed && !parsed) {
      return (
        <div className="flex items-center gap-3 p-3.5 text-[13px] text-slate-500">
          <span>
            {collapsedExpandError
              ? t('diff.couldNotLoadDiff', { v1: collapsedExpandError })
              : t('diff.loadingDiff')}
          </span>
          {collapsedExpandError && (
            <button
              type="button"
              className="cursor-pointer rounded border border-slate-300 px-2 py-1 font-medium text-slate-700 text-xs hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              disabled={isLoadingCollapsedExpand}
              onClick={() => void content.expandCollapsedFile()}
            >
              {t('common.retry')}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="p-3.5 text-[13px] text-slate-500">
        {isResolvingDiff || isLoadingCollapsedExpand
          ? t('diff.loadingDiff')
          : t('diff.noDiffForThisFile')}
      </div>
    );
  };

  return (
    <article
      id={getDiffFileElementId(fileKey)}
      className={cn(
        'w-full min-w-0 rounded-lg border bg-white dark:bg-gray-900',
        isActive
          ? 'border-accent-blue ring-2 ring-[var(--color-accent-blue-ring)] dark:border-accent-blue'
          : 'border-[var(--diff-border)]',
      )}
      onClickCapture={(event) => {
        const target = event.target as HTMLElement;
        if (
          target.closest('button, a, input, textarea, select, label, dialog')
        ) {
          return;
        }

        navigation.setActive();
      }}
    >
      <header className="git-diff-file-header sticky top-0 z-20 flex flex-wrap items-center gap-2.5 rounded-t-lg border-[var(--diff-border)] border-b bg-[var(--diff-header-bg)] px-3.5 py-2.5 sm:flex-nowrap">
        {isCollapsible && (
          <button
            className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--color-fg-subtle)] transition hover:bg-[var(--color-accent-emphasis-hover)] dark:text-[var(--color-fg-muted)] dark:hover:bg-[var(--color-canvas-muted)]"
            type="button"
            title={isFileExpanded ? t('diff.collapseFile') : t('diff.expandFile')}
            aria-label={isFileExpanded ? t('diff.collapseFile') : t('diff.expandFile')}
            onClick={content.toggleFileExpanded}
          >
            <svg
              aria-hidden="true"
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                isFileExpanded && 'rotate-90',
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
        <div className="flex min-w-0 flex-1 basis-[calc(100%-3rem)] items-center gap-0.5 sm:basis-0">
          {payload.renderFileAction && (
            <span className="git-diff-file-reviewed-mark" aria-hidden="true">
              <Check className="size-3.5" />
            </span>
          )}
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
              label={t('diff.copyPath')}
              icon={<CopyPathIcon />}
              getValue={() => filePath}
            />
            <DiffFileCopyButton
              compact
              label={t('diff.copyName')}
              icon={<CopyNameIcon />}
              getValue={() => getFileNameFromPath(filePath)}
            />
          </div>
        </div>

        {additions > 0 || deletions > 0 ? (
          <span className="flex shrink-0 items-center gap-2 font-bold font-mono text-xs">
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
          <span className={diffFileBadgeVariants({ badge })}>{badge}</span>
        )}

        <div className="ml-2 flex shrink-0 items-center">
          {!model.images && (
            <DiffFileCopyButton
              label={t('diff.copyContents')}
              icon={<CopyContentIcon />}
              getValue={content.copyFileContent}
            />
          )}
          {openInFilesHref && (
            <Link
              className={cn(
                diffFileHeaderTextButtonVariants(),
                'ml-2 no-underline',
              )}
              href={openInFilesHref}
              title={t('diff.openFileInFiles')}
            >
              {t('diff.openInFiles')}
            </Link>
          )}
        </div>

        {payload.renderFileAction?.(change)}

        {canComment && (
          <button
            className={diffFileHeaderTextButtonVariants()}
            type="button"
            onClick={comments.toggleFileCommentOpen}
          >
            {isFileCommentOpen ? t('diff.hideComment') : t('diff.fileComment')}
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
        <div className="border-slate-200 border-b dark:border-[var(--color-border-default)]">
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

      {model.images ? (
        <DiffImages images={model.images} />
      ) : (
        <div
          className="git-diff-body-scroll"
          data-wrap-code={wrapSourceCodeKey.value ? '' : undefined}
          style={
            {
              '--diff-code-font-size': `${codeFontSizeKey.value}px`,
            } as CSSProperties
          }
        >
          <div
            className="git-diff-body-inner"
            data-diff-notice={
              showTooLargeBanner || isDiffContentHidden ? '' : undefined
            }
            style={
              reservedBodyMinHeight
                ? { minHeight: reservedBodyMinHeight }
                : undefined
            }
          >
            {renderDiffContent()}
          </div>
        </div>
      )}
    </article>
  );
});
