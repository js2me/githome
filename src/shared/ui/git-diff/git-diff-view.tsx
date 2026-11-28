import { t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import { GitDiffFile } from './components/file/git-diff-file';
import { ReviewedDiffStack } from './components/file/reviewed-diff-stack';
import './styles.css';
import { withPropsViewModel } from 'mobx-view-model-react';
import { GitDiffVM } from './model/git-diff-vm';

export const GitDiffView = withPropsViewModel(
  GitDiffVM,
  ({
    model: {
      payload: { changes },
      filesGitDiffs,
      reviewedStackAnchor,
      listRef,
    },
  }) => {
    if (changes.length === 0) {
      return (
        <StatusMessage>
          {t('diff.noChangesFoundInThisMergeRequest')}
        </StatusMessage>
      );
    }

    const reviewed = filesGitDiffs.filter((file) => file.content.isReviewed);
    const anchor =
      reviewed.find((file) => file.fileKey === reviewedStackAnchor) ??
      reviewed[0];
    const files = filesGitDiffs
      .filter((file) => !file.content.isReviewed || file === anchor)
      .flatMap((file) =>
        file.content.isReviewed
          ? [
              <ReviewedDiffStack key="reviewed-stack" files={reviewed} />,
              ...reviewed.map((item) => (
                <GitDiffFile key={item.fileKey} model={item} />
              )),
            ]
          : [<GitDiffFile key={file.fileKey} model={file} />],
      );

    return (
      <div
        ref={listRef}
        className="git-diff flex flex-col gap-4 [overflow-anchor:none]"
      >
        {/* Keep the same React parent when a file moves into the stack. */}
        {files}
      </div>
    );
  },
);
