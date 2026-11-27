import { observer } from 'mobx-react-lite';
import { durationLabel } from '@/entities/gitlab-pipelines';
import { t } from '@/shared/lib/i18n';
import { PipelineDetailsDialog } from '@/widgets/pipeline-card';
import { getPipelineMergeRequestIid } from '../../model/pipeline-list';
import { DateTime } from './date-time';
import { RunAction } from './run-action';
import { control, errorText, type RunProps } from './run-presentation';

const sources: Record<string, string> = {
  get push() {
    return t('pipelines.branchOrTagUpdate');
  },
  get web() {
    return t('pipelines.gitlabInterface');
  },
  api: 'API',
  get merge_request_event() {
    return t('pipelines.mergeRequest');
  },
  get schedule() {
    return t('pipelines.schedule');
  },
  get trigger() {
    return t('pipelines.trigger');
  },
  get pipeline() {
    return t('pipelines.anotherPipeline');
  },
  get parent_pipeline() {
    return t('pipelines.parentPipeline');
  },
  get chat() {
    return t('pipelines.chat');
  },
  get external() {
    return t('pipelines.externalService');
  },
  get webide() {
    return t('pipelines.webIde');
  },
  get external_pull_request_event() {
    return t('pipelines.externalPullRequest');
  },
};

export const RunDetails = observer(({ model, run }: RunProps) => {
  const list = model.pipelineList;
  const iid = getPipelineMergeRequestIid(run);
  const mr = list.mergeRequestForPipeline(run);
  const duration = durationLabel(run.duration);
  const author = run.user?.name || run.user?.username;
  return (
    <PipelineDetailsDialog
      projectId={run.project_id}
      projectPath={model.projectPath}
      onRefresh={model.refreshDetails}
      refreshing={model.jobs.isFetching}
      pipelineId={run.id}
      pipeline={run}
      jobs={model.jobs.data ?? []}
      loading={model.jobs.isLoading}
      onClose={model.closeDetails}
      error={
        model.jobs.error
          ? errorText(model.jobs.error, t('pipelines.couldNotLoadJobs'))
          : null
      }
      description={
        <>
          {mr && (
            <p className="mb-2 font-semibold text-fg-default">{mr.title}</p>
          )}
          <dl className="pipeline-details-meta">
            <div>
              <dt>{t('pipelines.branchOrTag')}</dt>
              <dd className="font-mono">{mr?.source_branch || run.ref}</dd>
            </div>
            {run.sha && (
              <div>
                <dt>{t('common.commit')}</dt>
                <dd className="font-mono" title={run.sha}>
                  {run.sha.slice(0, 8)}
                </dd>
              </div>
            )}
            {run.source && (
              <div>
                <dt>{t('pipelines.source')}</dt>
                <dd>{sources[run.source] || run.source}</dd>
              </div>
            )}
            {author && (
              <div>
                <dt>{t('pipelines.author')}</dt>
                <dd>{author}</dd>
              </div>
            )}
            <div>
              <dt>{t('common.updated')}</dt>
              <dd>
                <DateTime value={run.updated_at || run.created_at} />
              </dd>
            </div>
            {duration && (
              <div>
                <dt>{t('pipelines.duration')}</dt>
                <dd>{duration}</dd>
              </div>
            )}
          </dl>
          {(list.actionError || model.jobActionError) && (
            <p
              role="alert"
              className="mt-3 whitespace-pre-line text-[var(--color-danger-fg)] text-sm"
            >
              {[list.actionError, model.jobActionError]
                .filter(Boolean)
                .join('\n')}
            </p>
          )}
        </>
      }
      actions={
        <>
          {iid !== null && (
            <button
              className={control}
              type="button"
              onClick={() => list.openMergeRequest(iid)}
            >
              {t('pipelines.openMergeRequest', { id: iid })}
            </button>
          )}
          <RunAction model={model} run={run} />
        </>
      }
      jobControls={
        list.canManageJobs
          ? {
              blocked: list.busyPipelineId === run.id,
              pendingAction: model.pendingJobAction,
              run: model.runJobs,
            }
          : undefined
      }
    />
  );
});
