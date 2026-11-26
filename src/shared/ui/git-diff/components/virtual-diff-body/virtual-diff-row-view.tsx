import { observer } from 'mobx-react-lite';
import type { VirtualDiffRow } from '@/shared/lib/diff/build-diff-virtual-rows';
import type { FileGitDiff } from '../../model/file-git-diff';
import {
  DiffCommentFormRow,
  DiffExpandRow,
  DiffHunkRow,
  DiffLineRow,
  DiffThreadRow,
} from '../diff-rows';

export const VirtualDiffRowView = observer(
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
