import { observer } from 'mobx-react-lite';
import { StatusMessage } from '@/shared/ui/status-message';
import { PipelineCard } from '@/widgets/pipeline-card';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { MrLifecycleActions } from '../lifecycle/mr-lifecycle-actions';
import { MergeRequestOverview } from '../merge-request-overview';
import { MrReviewActions } from '../mr-review-actions';

export const MergeRequestHeader = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const page = model.parentViewModel;
    const info = page.mrInfo;
    const detail = info.detailView;
    if (!detail) return null;
    const { mergeRequest, changes, approvals } = detail;
    const { markdownScope } = model;
    return (
      <div className="flex min-w-0 flex-col gap-3">
        {info.resolveDiscussionError && (
          <StatusMessage error>{info.resolveDiscussionError}</StatusMessage>
        )}
        <MergeRequestOverview
          mergeRequest={mergeRequest}
          jira={page.jiraSummary}
          projectPath={markdownScope.projectPath}
          loadedFiles={changes.length}
          actions={
            <MrLifecycleActions
              key={`lifecycle-${mergeRequest.web_url}`}
              model={model}
            />
          }
          onShowFiles={model.showFiles}
          onShowComments={model.showComments}
        >
          {mergeRequest.head_pipeline && markdownScope.projectId > 0 ? (
            <PipelineCard
              payload={{
                projectId: markdownScope.projectId,
                projectPath: markdownScope.projectPath,
                pipelineId: mergeRequest.head_pipeline.id,
                permissions: page.project?.permissions,
              }}
            />
          ) : null}
        </MergeRequestOverview>
        {info.lifecycleActionError && (
          <StatusMessage error>{info.lifecycleActionError}</StatusMessage>
        )}
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
      </div>
    );
  },
);
