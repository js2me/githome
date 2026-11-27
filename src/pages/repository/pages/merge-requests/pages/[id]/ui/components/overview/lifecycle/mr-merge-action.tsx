import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { t } from '@/shared/lib/i18n';
import { GlassDialog } from '@/shared/ui/glass-dialog';
import { StatusMessage } from '@/shared/ui/status-message';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { actionClass } from '../action-classes';
import { MrMergeFields } from './mr-merge-fields';

const primaryClass =
  'glass-primary inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 font-semibold text-xs disabled:opacity-50';

export const MrMergeAction = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const merge = model.merge;
    const mr = model.parentViewModel.mrInfo.mergeRequestDetail;
    const titleId = useId();
    if (!mr) return null;

    const options = merge.options;
    const cancelling = options?.autoMergeEnabled === true;
    const isTrain =
      merge.mode === 'MERGE_TRAIN' ||
      merge.mode === 'ADD_TO_MERGE_TRAIN_WHEN_CHECKS_PASS';
    const auto = merge.mode === 'MERGE_WHEN_CHECKS_PASS';
    const confirmLabel = cancelling
      ? 'review.cancelAutoMerge'
      : isTrain
        ? 'review.addToMergeTrain'
        : auto
          ? 'review.enableAutoMerge'
          : 'review.mergeAction';

    return (
      <>
        <button
          type="button"
          className={primaryClass}
          aria-haspopup="dialog"
          disabled={!merge.canOpen}
          onClick={merge.open}
        >
          {t(
            merge.scheduled ? 'review.autoMergeEnabled' : 'review.mergeAction',
          )}
        </button>
        <GlassDialog
          ref={merge.dialog}
          aria-labelledby={titleId}
          className="max-h-[85dvh] w-[min(34rem,calc(100%-2rem))] overflow-auto p-5 sm:p-6"
          onClose={merge.onClosed}
          onCancel={(event) => {
            if (merge.busy) event.preventDefault();
          }}
        >
          <p id={titleId} className="font-semibold text-lg">
            {t('review.mergeDialogTitle', { iid: mr.iid })}
          </p>
          <p className="mt-2 break-all text-fg-muted text-sm">
            {mr.source_branch} → {mr.target_branch}
          </p>
          <div className="mt-4 grid gap-3">
            {merge.isLoading && (
              <StatusMessage>{t('review.checkingMerge')}</StatusMessage>
            )}
            {merge.error && (
              <div className="grid gap-2">
                <StatusMessage error>{merge.error}</StatusMessage>
                {!merge.busy && !merge.isLoading && !merge.result && (
                  <button
                    type="button"
                    className={actionClass}
                    onClick={merge.load}
                  >
                    {t('pipelines.refresh')}
                  </button>
                )}
              </div>
            )}
            {merge.result && (
              <StatusMessage>
                {t(
                  merge.result === 'sent'
                    ? 'review.mergeSentToGitLab'
                    : 'review.autoMergeCancelled',
                )}
              </StatusMessage>
            )}
            {options && !merge.result && (
              <MrMergeFields model={merge} options={options} />
            )}
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={actionClass}
              disabled={merge.busy}
              onClick={merge.close}
            >
              {t(merge.result ? 'common.close' : 'common.cancel')}
            </button>
            {options && !merge.result && (cancelling || merge.mode) && (
              <button
                type="button"
                className={primaryClass}
                disabled={merge.busy}
                onClick={merge.confirm}
              >
                {t(merge.busy ? 'review.merging' : confirmLabel)}
              </button>
            )}
          </div>
        </GlassDialog>
      </>
    );
  },
);
