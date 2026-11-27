import { Xmark } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { GlassDialog } from '@/shared/ui/glass-dialog';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { actionClass } from '../action-classes';
import { MrMergeAction } from './mr-merge-action';

export const MrLifecycleActions = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const info = model.parentViewModel.mrInfo;
    const titleId = useId();
    const descriptionId = useId();
    const mr = info.mergeRequestDetail;
    if (mr?.state !== 'opened') return null;

    const action = info.actionInProgress;
    const busy = action !== null;

    return (
      <>
        <MrMergeAction model={model} />
        <button
          type="button"
          className={cn(actionClass, 'text-[var(--color-danger-fg)]')}
          aria-haspopup="dialog"
          disabled={busy}
          onClick={model.showCloseMrDialog}
        >
          <Xmark aria-hidden className="size-3.5" />
          {t(action === 'close' ? 'review.closing' : 'common.close')}
        </button>
        <GlassDialog
          ref={model.closeMrDialog}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="w-[min(28rem,calc(100%-2rem))] p-5 sm:p-6"
        >
          <p id={titleId} className="font-semibold text-lg">
            {t('review.confirmCloseTitle', { v1: mr.iid })}
          </p>
          <p id={descriptionId} className="mt-2 text-fg-muted text-sm">
            {t('review.confirmCloseDescription')}
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={actionClass}
              onClick={model.dismissCloseMrDialog}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={cn(actionClass, 'text-[var(--color-danger-fg)]')}
              disabled={busy}
              onClick={model.confirmCloseMr}
            >
              {t('review.confirmCloseAction')}
            </button>
          </div>
        </GlassDialog>
      </>
    );
  },
);
