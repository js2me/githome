import { Check } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { Link } from 'mobx-route/react';
import { cva } from 'yummies/css';
import { cn } from '@/shared/lib/cn';
import {
  getDiffFileElementId,
  getDiffFileHeaderRowId,
} from '@/shared/lib/diff/diff-search';
import { t } from '@/shared/lib/i18n';
import type { FileGitDiff } from '../../model/file-git-diff';
import { DiffThreadRow } from '../diff-rows';
import { SearchHighlightedText, useRowSearchHighlight } from '../diff-search';
import { CopyContentIcon } from '../icons/copy-content-icon';
import { CopyNameIcon } from '../icons/copy-name-icon';
import { CopyPathIcon } from '../icons/copy-path-icon';
import { DiffFileContent } from './diff-file-content';
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
    comments,
    navigation,
    parent: { payload },
  } = model;

  const {
    change,
    fileKey,
    badge,
    filePath,
    fileThreads,
    searchFilePath,
    isActive,
    additions,
    deletions,
  } = meta;

  const { isFileExpanded, isReviewed, isContentCollapsed } = content;
  const isExpanded = isFileExpanded && !isContentCollapsed;
  const toggleLabel = t(isExpanded ? 'diff.collapseFile' : 'diff.expandFile');

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

  return (
    <article
      id={getDiffFileElementId(fileKey)}
      data-diff-reviewed={isReviewed ? '' : undefined}
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
        <button
          className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--color-fg-subtle)] transition hover:bg-[var(--color-accent-emphasis-hover)] dark:text-[var(--color-fg-muted)] dark:hover:bg-[var(--color-canvas-muted)]"
          type="button"
          title={toggleLabel}
          aria-label={toggleLabel}
          aria-expanded={isExpanded}
          onClick={content.toggleFileExpanded}
        >
          <svg
            aria-hidden="true"
            className={cn(
              'h-3.5 w-3.5 transition-transform',
              isExpanded && 'rotate-90',
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

        {payload.renderFileAction?.(change, content.setReviewed)}

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

      <DiffFileContent model={model} />
    </article>
  );
});
