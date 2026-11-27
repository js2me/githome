import { Check } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { getDiffFileElementId } from '@/shared/lib/diff/diff-search';
import { t } from '@/shared/lib/i18n';
import type { FileGitDiff } from '../../model/file-git-diff';

export const ReviewedDiffStack = observer(
  ({ files }: { files: FileGitDiff[] }) => (
    <details className="git-diff-reviewed-stack" data-diff-reviewed-stack="">
      <summary
        aria-controls={files
          .map((file) => getDiffFileElementId(file.fileKey))
          .join(' ')}
        className="git-diff-reviewed-stack__summary"
      >
        <span className="git-diff-reviewed-stack__chevron" aria-hidden="true" />
        <span className="git-diff-reviewed-stack__mark" aria-hidden="true">
          <Check className="size-3.5" />
        </span>
        <span>{t('diff.reviewedFiles')}</span>
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs tabular-nums dark:bg-white/10">
          {files.length}
        </span>
      </summary>
    </details>
  ),
);
