import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import type { MergeRequestDetailVM } from '../../../model/merge-request-detail';
import { MergeRequestCommentForm } from './merge-request-comment-form';
import { MergeRequestDiscussions } from './merge-request-discussions';

export const MrDiscussionPanel = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const info = model.parentViewModel.mrInfo;
    const { markdownScope } = model;
    return (
      <div className="grid min-w-0 gap-4">
        {info.mergeRequestDiscussions === null ? (
          <StatusMessage>{t('common.loading')}</StatusMessage>
        ) : model.activityDiscussions.length ? (
          <MergeRequestDiscussions
            markdownScope={markdownScope}
            discussions={model.activityDiscussions}
            onResolveDiscussion={info.resolveDiscussion}
            resolvingDiscussionId={info.resolvingDiscussionId}
            {...model.noteActions}
          />
        ) : (
          <p className="mr-pane-message">{t('workbench.noDiscussion')}</p>
        )}
        <MergeRequestCommentForm
          projectId={markdownScope.projectId}
          canComment={
            Boolean(model.parentViewModel.project) &&
            info.detailView?.mergeRequest.state === 'opened'
          }
          isSubmitting={info.isSubmittingMrComment}
          submitError={info.submitMrCommentError}
          onSubmit={info.submitMrComment}
          onClearSubmitError={info.clearSubmitMrCommentError}
        />
      </div>
    );
  },
);
