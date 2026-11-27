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
    const remaining = filesGitDiffs.filter((file) => !file.content.isReviewed);

    return (
      <div className="git-diff flex flex-col gap-4 [overflow-anchor:none]">
        {/* Keep the same React parent when a file moves into the stack. */}
        {[
          ...remaining.map((file) => (
            <GitDiffFile key={file.fileKey} model={file} />
          )),
          ...(reviewed.length
            ? [
                <ReviewedDiffStack key="reviewed-stack" files={reviewed} />,
                ...reviewed.map((file) => (
                  <GitDiffFile key={file.fileKey} model={file} />
                )),
              ]
            : []),
        ]}
      </div>
    );
  },
);
