import { ArrowRotateRight, CircleStop } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { durationLabel } from '@/entities/gitlab-pipelines';
import { getLocale, t } from '@/shared/lib/i18n';
import { PipelineRunVM } from './model';
import { PipelineDetailsDialog } from './pipeline-details-dialog';

export const PipelineRunDialog = withPropsViewModel(
  PipelineRunVM,
  ({ model }) => {
    const { projectId, pipelineId, labelKey, history, heading, onClose } =
      model.payload;
    const { pipeline } = model;
    const run = model.pipelineQuery.data;
    const ref = pipeline?.ref;
    const sha = pipeline?.sha;
    const date = run?.updated_at || run?.created_at;
    const duration = durationLabel(run?.duration);
    const { pipelineAction, busyPipeline } = model;
    const cancel = pipelineAction === 'cancel';
    const actionLabel = cancel ? t('common.cancel2') : t('common.retry');
    const ActionIcon = cancel ? CircleStop : ArrowRotateRight;

    return (
      <PipelineDetailsDialog
        projectId={projectId}
        projectPath={model.projectPath}
        pipelineId={pipelineId}
        pipeline={pipeline}
        kindLabel={labelKey && t(labelKey)}
        manager={{ history, heading }}
        description={
          (ref || sha || date || duration) && (
            <dl className="pipeline-manager-meta">
              {ref && (
                <div>
                  <dt>{t('pipelines.branchOrTag')}</dt>
                  <dd className="font-mono">{ref}</dd>
                </div>
              )}
              {sha && (
                <div>
                  <dt>{t('common.commit')}</dt>
                  <dd className="font-mono" title={sha}>
                    {sha.slice(0, 8)}
                  </dd>
                </div>
              )}
              {date && (
                <div>
                  <dt>{t('common.updated')}</dt>
                  <dd>
                    <time dateTime={date}>
                      {new Date(date).toLocaleString(getLocale(), {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </time>
                  </dd>
                </div>
              )}
              {duration && (
                <div>
                  <dt>{t('pipelines.duration')}</dt>
                  <dd>{duration}</dd>
                </div>
              )}
            </dl>
          )
        }
        onRefresh={model.refreshDetails}
        actions={
          pipelineAction && (
            <button
              className="glass-control inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 font-semibold text-sm"
              type="button"
              aria-label={t('pipelines.pipeline', {
                v1: actionLabel,
                v2: pipelineId,
              })}
              disabled={Boolean(busyPipeline) || model.jobRunner.hasPending}
              onClick={() => void model.runPipelineAction()}
            >
              <ActionIcon className="size-4" aria-hidden />
              {busyPipeline ? t('pipelines.working') : actionLabel}
            </button>
          )
        }
        refreshing={
          model.payload.historyRefreshing ||
          model.jobsQuery.isFetching ||
          model.pipelineQuery.isFetching
        }
        jobs={model.jobs}
        loading={model.isLoading}
        error={[
          model.pipelineErrorMessage,
          model.errorMessage,
          model.actionError,
        ]
          .filter(Boolean)
          .join('\n')}
        onClose={onClose}
        jobControls={
          model.canRunJobs
            ? {
                blocked: Boolean(busyPipeline),
                pendingAction: model.pendingJobAction,
                run: model.runJobs,
              }
            : undefined
        }
      />
    );
  },
);
