import { withViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import { MergeRequestDetailVM } from '../../model/merge-request-detail';
import { MrEditorWorkspace } from './changes/editor/mr-editor-workspace';
import { MrOverviewWorkspace } from './overview/workspace/mr-overview-workspace';
import './review-workspace.css';

export const MergeRequestDetail = withViewModel(
  MergeRequestDetailVM,
  ({ model }) => {
    const { mrInfo: info } = model.parentViewModel;
    const open = model.editorOpen;

    return (
      <>
        {open ? (
          <MrEditorWorkspace model={model} />
        ) : (
          <MrOverviewWorkspace model={model} />
        )}
        <div className="px-3 text-fg-muted text-sm empty:hidden" role="status">
          {info.detailView?.mergeRequest.state === 'opened' &&
            model.merge.result &&
            t(
              model.merge.result === 'sent'
                ? 'review.mergeSentToGitLab'
                : 'review.autoMergeCancelled',
            )}
        </div>
        {info.lifecycleActionError && (
          <StatusMessage error>{info.lifecycleActionError}</StatusMessage>
        )}
        {info.resolveDiscussionError && (
          <StatusMessage error>{info.resolveDiscussionError}</StatusMessage>
        )}
      </>
    );
  },
);
