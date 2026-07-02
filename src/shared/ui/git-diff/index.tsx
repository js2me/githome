import { getDiffFileKey } from "@/shared/lib/diff-search";
import { StatusMessage } from "@/shared/ui/status-message";
import { GitDiffFile } from "./components/git-diff-file";
import "./styles.css";
import { withPropsViewModel } from "mobx-view-model";
import { GitDiffVM } from "./model";

export const GitDiff = withPropsViewModel(GitDiffVM,
  ({
    model: { payload: {
      changes,
      discussions,
      canComment,
      isSubmittingComment,
      submitCommentError,
      onAddComment,
      onClearSubmitError,
      headRef,
      baseRef,
      loadFileContent,
      onResolveThread,
      resolvingDiscussionId,
      activeFileKey,
      onActiveFileChange, } }
  }) => {
    if (changes.length === 0) {
      return (
        <StatusMessage>Изменения в merge request не найдены.</StatusMessage>
      );
    }

    return (
      <div className="git-diff flex flex-col gap-4 overflow-x-auto">
        {changes.map((change) => {
          const fileKey = getDiffFileKey(change.old_path, change.new_path);

          return (
            <GitDiffFile
              key={`${change.new_path}:${change.old_path}`}
              change={change}
              discussions={discussions}
              canComment={canComment}
              isSubmittingComment={isSubmittingComment}
              submitCommentError={submitCommentError}
              onAddComment={onAddComment}
              onClearSubmitError={onClearSubmitError}
              headRef={headRef ?? null}
              baseRef={baseRef ?? null}
              loadFileContent={loadFileContent}
              onResolveThread={onResolveThread}
              resolvingDiscussionId={resolvingDiscussionId}
              isActive={activeFileKey === fileKey}
              onActiveFileChange={onActiveFileChange}
            />
          );
        })}
      </div>
    );
  },
);
