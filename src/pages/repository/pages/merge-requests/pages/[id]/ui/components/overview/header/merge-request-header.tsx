import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import { PipelineCard } from '@/widgets/pipeline-card';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { MrLifecycleActions } from '../lifecycle/mr-lifecycle-actions';
import { MergeRequestOverview } from '../merge-request-overview';
import { MergeRequestMetadata } from '../metadata/merge-request-metadata';
import { MrReviewActions } from '../mr-review-actions';

export const MergeRequestHeader = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const page = model.parentViewModel;
    const info = page.mrInfo;
    const detail = info.detailView;
    if (!detail) return null;
    const { mergeRequest, changes, approvals } = detail;
    const { markdownScope } = model;
    const { cards, hasError } = model.pipelines;
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
          metadata={<MergeRequestMetadata model={model.metadata} />}
          actions={
            <MrLifecycleActions
              key={`lifecycle-${mergeRequest.web_url}`}
              model={model}
            />
          }
          onShowFiles={model.showFiles}
          onShowComments={model.showComments}
        >
          {(cards.length > 0 || hasError) && (
            <div className="grid gap-1.5">
              {cards.map(({ kind, pipeline, projectId }) => {
                const sameProject = projectId === markdownScope.projectId;
                return (
                  <PipelineCard
                    key={`${projectId}/${pipeline.id}`}
                    payload={{
                      projectId,
                      projectPath: sameProject
                        ? markdownScope.projectPath
                        : undefined,
                      permissions: sameProject
                        ? page.project?.permissions
                        : undefined,
                      lookupProject: !sameProject,
                      pipelineId: pipeline.id,
                      summary: pipeline,
                      labelKey:
                        kind === 'mr'
                          ? 'pipelines.mrPipeline'
                          : kind === 'branch'
                            ? 'pipelines.branchPipeline'
                            : 'pipelines.pipeline2',
                    }}
                  />
                );
              })}
              {hasError && (
                <p className="text-fg-muted text-xs" role="status">
                  {t('pipelines.couldNotLoadAllPipelines')}
                </p>
              )}
            </div>
          )}
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
