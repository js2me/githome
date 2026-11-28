import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { MrReviewActions } from '../mr-review-actions';
import { MrPipelines } from '../pipelines/mr-pipelines';
import { MergeRequestMetadata } from './merge-request-metadata';

export const MrContextPanel = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const page = model.parentViewModel;
    const info = page.mrInfo;
    const detail = info.detailView;
    if (!detail) return null;

    const { mergeRequest, approvals } = detail;
    return (
      <aside className="mr-context-panel" aria-label={t('workbench.review')}>
        <MergeRequestMetadata model={model.metadata} />

        <MrPipelines model={model} />

        {approvals && (
          <MrReviewActions
            mergeRequest={mergeRequest}
            approvals={approvals}
            reviewActionInProgress={info.actionInProgress}
            reviewActionError={info.reviewActionError}
            onApprove={info.approve}
            onUnapprove={info.unapprove}
            onRequestChanges={info.requestChanges}
            onCancelRequestChanges={info.cancelRequestChanges}
          />
        )}
      </aside>
    );
  },
);
