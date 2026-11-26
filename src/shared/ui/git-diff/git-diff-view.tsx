import { t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import { GitDiffFile } from './components/file/git-diff-file';
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

    return (
      <div className="git-diff flex flex-col gap-4 [overflow-anchor:none]">
        {filesGitDiffs.map((fileModel) => (
          <GitDiffFile key={fileModel.fileKey} model={fileModel} />
        ))}
      </div>
    );
  },
);
