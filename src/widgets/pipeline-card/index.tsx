import { ArrowUpRightFromSquare, ChevronRight } from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import {
  PipelineStatus,
  pipelineStatusLabel,
} from '@/entities/gitlab-pipelines';
import { t } from '@/shared/lib/i18n';
import { PipelineCardVM } from './model';
import { PipelineDetailsDialog } from './pipeline-details-dialog';

export const PipelineCard = withViewModel(PipelineCardVM, ({ model }) => {
  const { pipelineId, projectId, labelKey } = model.payload;
  const { pipeline, projectPath } = model;
  const label = t(labelKey ?? 'pipelines.pipeline2');
  const status =
    pipeline?.status ??
    (model.pipelineQuery.isLoading
      ? t('common.loading2')
      : t('pipelines.statusUnavailable'));

  return (
    <section
      className="min-w-0 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-control)]"
      aria-label={label}
    >
      <div className="flex min-w-0 items-center gap-2 px-2.5 py-0.5 sm:gap-3">
        <span className="min-w-0 font-semibold text-fg-default text-xs">
          {label}
        </span>
        {pipeline?.web_url ? (
          <a
            className="inline-flex shrink-0 items-center gap-1 rounded-sm py-1 font-mono text-fg-link text-xs hover:underline"
            href={pipeline.web_url}
            target="_blank"
            rel="noreferrer"
            aria-label={t('pipelines.openPipelineInGitlab', { v1: pipelineId })}
          >
            #{pipelineId}
            <ArrowUpRightFromSquare className="size-3" aria-hidden />
          </a>
        ) : (
          <span className="shrink-0 font-mono text-fg-muted text-xs">
            #{pipelineId}
          </span>
        )}
        <button
          className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 text-left hover:bg-[var(--glass-hover)]"
          type="button"
          aria-haspopup="dialog"
          aria-label={t('pipelines.openPipelineDetails', {
            v1: pipelineId,
            v2: pipelineStatusLabel(status),
          })}
          onClick={model.openDetails}
        >
          <PipelineStatus status={status} />
          <ChevronRight
            className="size-3.5 shrink-0 text-fg-muted"
            aria-hidden
          />
        </button>
      </div>
      {model.detailsOpen && (
        <PipelineDetailsDialog
          projectId={projectId}
          projectPath={projectPath}
          onRefresh={model.refreshDetails}
          refreshing={
            model.jobsQuery.isFetching || model.pipelineQuery.isFetching
          }
          pipelineId={pipelineId}
          pipeline={pipeline}
          kindLabel={labelKey && label}
          jobs={model.jobs}
          loading={model.isLoading}
          error={[
            model.pipelineErrorMessage,
            model.errorMessage,
            model.actionError,
          ]
            .filter(Boolean)
            .join('\n')}
          onClose={model.closeDetails}
          jobControls={
            model.canRunJobs
              ? {
                  pendingAction: model.pendingJobAction,
                  run: model.runJobs,
                }
              : undefined
          }
        />
      )}
    </section>
  );
});

export { PipelineDetailsDialog } from './pipeline-details-dialog';
