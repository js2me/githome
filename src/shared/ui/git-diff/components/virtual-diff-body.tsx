import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { observer } from 'mobx-react-lite';
import { useLayoutEffect } from 'react';
import type { VirtualDiffRow } from '@/shared/lib/build-diff-virtual-rows';
import {
  codeFontSizeKey,
  wrapSourceCodeKey,
} from '@/shared/lib/code-view-preferences';
import type { FileGitDiff } from '../model/file-git-diff';
import {
  DiffCommentFormRow,
  DiffExpandRow,
  DiffHunkRow,
  DiffLineRow,
  DiffThreadRow,
} from './diff-rows';

const isDiffCodeRow = (row: VirtualDiffRow) =>
  row.type === 'line' || row.type === 'hunk' || row.type === 'expand';

const getDiffRowLayoutClassName = (row: VirtualDiffRow) =>
  isDiffCodeRow(row) ? 'git-diff-code-row w-full' : 'w-full min-w-full';

const VirtualDiffRowView = observer(
  ({ row, file }: { row: VirtualDiffRow; file: FileGitDiff }) => {
    const payload = file.parent.payload;
    if (row.type === 'expand') {
      return (
        <DiffExpandRow
          gap={row.gap}
          expandState={row.expandState}
          isLoading={row.isLoading}
          hunkHeader={row.hunkHeader}
          onExpand={(gap, mode) =>
            file.meta.canExpand && file.expand.expandGap(gap.id, mode)
          }
        />
      );
    }

    if (row.type === 'hunk') {
      return <DiffHunkRow header={row.header} />;
    }

    if (row.type === 'line') {
      const selected = file.selection.lineSelection;
      return (
        <DiffLineRow
          line={row.line}
          prefix={row.prefix}
          lineKey={row.lineKey}
          rowId={row.id}
          canComment={payload.canComment}
          hasThreads={row.threadsCount > 0}
          threads={row.threads}
          isThreadExpanded={file.rows.isThreadExpanded}
          onToggleThreadExpand={file.rows.toggleThread}
          isSelected={Boolean(
            row.lineKey && file.selection.selectedKeys.has(row.lineKey),
          )}
          isSelectionStart={Boolean(
            row.lineKey && selected?.startKey === row.lineKey,
          )}
          isSelectionEnd={Boolean(
            row.lineKey && selected?.endKey === row.lineKey,
          )}
          wordDiffSegments={row.wordDiffSegments}
          onCommentClick={(shiftKey) => {
            if (row.lineKey) {
              file.selection.handleLineClick(row.lineKey, shiftKey);
            }
          }}
          onLineMouseDown={() => {
            if (row.lineKey) {
              file.selection.handleLineMouseDown(row.lineKey);
            }
          }}
          onLineMouseEnter={() => {
            if (row.lineKey) {
              file.selection.handleLineMouseEnter(row.lineKey);
            }
          }}
        />
      );
    }

    if (row.type === 'thread') {
      return (
        <DiffThreadRow
          markdownScope={payload.markdownScope}
          thread={row.thread}
          onResolveThread={payload.onResolveThread}
          resolvingDiscussionId={payload.resolvingDiscussionId}
          onReplyThread={payload.onReplyThread}
          replyingDiscussionId={payload.replyingDiscussionId}
          replyErrorDiscussionId={payload.replyErrorDiscussionId}
          replyError={payload.replyError}
          onClearReplyError={payload.onClearReplyError}
          expanded={
            !row.thread.resolved ||
            file.rows.isThreadExpanded(row.thread.discussionId)
          }
          onToggleExpand={() => file.rows.toggleThread(row.thread.discussionId)}
          currentUserId={payload.currentUserId}
          onUpdateNote={payload.onUpdateDiscussionNote}
          onDeleteNote={payload.onDeleteDiscussionNote}
          updatingNoteKey={payload.updatingNoteKey}
          deletingNoteKey={payload.deletingNoteKey}
          updateNoteError={payload.updateNoteError}
          deleteNoteErrorKey={payload.deleteNoteErrorKey}
          deleteNoteError={payload.deleteNoteError}
          onClearUpdateNoteError={payload.onClearUpdateNoteError}
          onClearDeleteNoteError={payload.onClearDeleteNoteError}
        />
      );
    }

    if (row.type === 'comment-form') {
      const selection = file.selection.lineSelection;
      if (!selection) return null;
      return (
        <DiffCommentFormRow
          key={file.selection.formKey}
          markdownScope={payload.markdownScope}
          errorMessage={payload.submitCommentError}
          isSubmitting={payload.isSubmittingComment}
          rangeLabel={file.rows.selectionRangeLabel}
          onCancel={file.selection.clearSelection}
          onSubmit={file.selection.submitLineComment}
        />
      );
    }

    return null;
  },
);

const VirtualizedDiffBody = observer(({ file }: { file: FileGitDiff }) => {
  const { navigation } = file;
  const rows = file.rows.virtualRows;
  const fontSize = codeFontSizeKey.value;
  const wrap = wrapSourceCodeKey.value;
  const lineHeight = fontSize * 1.6;
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (index) => {
      const row = rows[index];
      if (!row || row.type === 'line') return lineHeight;
      return row.estimatedHeight;
    },
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan: 24,
    scrollMargin: navigation.scrollMargin,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  const measureKey = file.rows.layoutKey;
  useLayoutEffect(() => {
    navigation.measureMargin();
    virtualizer.measure();
    for (const element of navigation.listRef.current?.querySelectorAll<HTMLElement>(
      ':scope > div > [data-index]',
    ) ?? []) {
      virtualizer.measureElement(element);
    }
  }, [fontSize, wrap, measureKey, navigation, virtualizer]);

  useLayoutEffect(() => {
    return navigation.registerScrollToRow((rowId: string) => {
      const index = rows.findIndex((row) => row.id === rowId);
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: 'center' });
      }
    });
  }, [navigation, rows, virtualizer]);

  return (
    <div ref={navigation.listRef} className="diff-viewport w-full pl-7">
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];

          return (
            <div
              key={row.id}
              data-index={virtualRow.index}
              data-diff-row-id={row.id}
              ref={virtualizer.measureElement}
              className={getDiffRowLayoutClassName(row)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start - navigation.scrollMargin}px)`,
              }}
            >
              <VirtualDiffRowView row={row} file={file} />
            </div>
          );
        })}
      </div>
    </div>
  );
});

export const DiffBody = observer(
  ({ fileGitDiff: file }: { fileGitDiff: FileGitDiff }) => {
    const { rows, navigation } = file;
    useLayoutEffect(() => rows.watchResolvedThreads(), [rows]);
    const formKey = file.selection.formKey;
    const commentLineKey = rows.commentFormLineKey;
    useLayoutEffect(() => {
      if (commentLineKey)
        navigation.scrollToRow(`comment-form:${commentLineKey}`);
    }, [formKey, commentLineKey, navigation]);

    if (rows.virtualized) return <VirtualizedDiffBody file={file} />;
    return (
      <div className="w-full pl-7">
        {rows.virtualRows.map((row) => (
          <div
            key={row.id}
            className={getDiffRowLayoutClassName(row)}
            data-diff-row-id={row.id}
          >
            <VirtualDiffRowView row={row} file={file} />
          </div>
        ))}
      </div>
    );
  },
);
