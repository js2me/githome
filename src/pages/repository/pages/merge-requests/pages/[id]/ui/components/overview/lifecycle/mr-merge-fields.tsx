import { observer } from 'mobx-react-lite';
import type { GitLabMergeOptions } from '@/shared/api/gitlab/endpoints/merge-requests/lifecycle/merge-options';
import { t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import type { MrMerge } from '../../../../model/merge/mr-merge';

export const MrMergeFields = observer(
  ({ model, options }: { model: MrMerge; options: GitLabMergeOptions }) => {
    if (options.autoMergeEnabled)
      return <StatusMessage>{t('review.autoMergeEnabled')}</StatusMessage>;
    if (options.mergeOngoing)
      return <StatusMessage>{t('review.merging')}</StatusMessage>;
    if (!model.mode)
      return (
        <StatusMessage>
          {t(
            options.userPermissions.canMerge
              ? 'review.mergeChecksNotPassed'
              : 'review.mergePermissionRequired',
          )}
        </StatusMessage>
      );

    const pipelineStatus = options.headPipeline?.status.toLowerCase();
    return (
      <>
        {model.mode !== 'immediate' && (
          <StatusMessage>{t('review.mergeAfterGitLabChecks')}</StatusMessage>
        )}
        {model.mode === 'immediate' &&
          (pipelineStatus === 'failed' || pipelineStatus === 'canceled') && (
            <StatusMessage>
              {t('review.mergeFailedPipelineWarning')}
            </StatusMessage>
          )}
        <fieldset className="grid min-w-0 gap-3 text-sm" disabled={model.busy}>
          {options.userPermissions.removeSourceBranch && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={model.removeSourceBranch}
                onChange={(event) => {
                  model.removeSourceBranch = event.target.checked;
                }}
              />
              {t('review.deleteSourceBranch')}
            </label>
          )}
          {(!options.squashReadOnly || options.squashOnMerge) && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={model.squash}
                disabled={options.squashReadOnly}
                onChange={(event) => {
                  model.squash = event.target.checked;
                }}
              />
              {t('review.squashCommits')}
            </label>
          )}
          {!options.mergeRequestsFfOnlyEnabled && (
            <label className="grid gap-1 font-semibold">
              {t('review.mergeCommitMessage')}
              <textarea
                className="glass-input min-h-16 rounded-xl p-2 font-normal"
                value={model.commitMessage}
                onChange={(event) => {
                  model.commitMessage = event.target.value;
                }}
              />
            </label>
          )}
          {model.canEditSquashMessage && (
            <label className="grid gap-1 font-semibold">
              {t('review.squashCommitMessage')}
              <textarea
                className="glass-input min-h-16 rounded-xl p-2 font-normal"
                value={model.squashMessage}
                onChange={(event) => {
                  model.squashMessage = event.target.value;
                }}
              />
            </label>
          )}
        </fieldset>
      </>
    );
  },
);
