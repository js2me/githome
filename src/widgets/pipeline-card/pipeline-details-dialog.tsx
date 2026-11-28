import {
  ArrowsRotateRight,
  ArrowUpRightFromSquare,
  Xmark,
} from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { useId } from 'react';
import {
  PipelineStatus,
  pipelineStatusLabel,
} from '@/entities/gitlab-pipelines';
import { t } from '@/shared/lib/i18n';
import { GlassDialog } from '@/shared/ui/glass-dialog';
import { PipelineDetailsDialogVM } from './model/details-dialog';
import { PipelineJobDetails } from './ui/pipeline-job-details';
import { PipelineStageGraph } from './ui/pipeline-stage-graph';
import './ui/pipeline-manager.css';

export const PipelineDetailsDialog = withPropsViewModel(
  PipelineDetailsDialogVM,
  ({ model }) => {
    const {
      projectId,
      pipelineId,
      pipeline,
      kindLabel,
      manager,
      jobs,
      loading,
      error,
      description,
      actions,
      refreshing,
      onClose,
    } = model.payload;
    const titleId = useId();
    const detailsId = useId();
    const { selectedJob } = model;

    return (
      <GlassDialog
        ref={model.dialog}
        aria-labelledby={titleId}
        onClose={(event) => {
          if (!event.currentTarget.open) onClose();
        }}
        className={
          manager
            ? 'pipeline-manager max-w-none overflow-hidden p-0 open:flex open:flex-col'
            : 'max-h-[calc(100vh-80px)] w-[min(76rem,calc(100%-1.5rem))] max-w-none overflow-hidden p-0 open:flex open:flex-col'
        }
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-[var(--glass-border)] border-b px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2
              id={titleId}
              className="break-words font-semibold text-lg tracking-tight"
            >
              {manager?.heading ??
                t('pipelines.pipelineNumber', { id: pipelineId })}
            </h2>
            {!manager && kindLabel && (
              <span className="text-fg-muted text-xs">{kindLabel}</span>
            )}
            {!manager && pipeline?.status && (
              <PipelineStatus status={pipeline.status} />
            )}
          </div>
          <button
            ref={model.closeButton}
            type="button"
            className="glass-control grid size-8 shrink-0 place-items-center rounded-lg"
            aria-label={t('pipelines.closePipelineDetails')}
            onClick={() => model.dialog.current?.close()}
          >
            <Xmark className="size-4" aria-hidden />
          </button>
        </header>
        <div className={manager ? 'pipeline-manager-layout' : 'contents'}>
          {manager?.history}
          <div className="min-h-0 min-w-0 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4">
            {manager && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="font-semibold">
                  {t('pipelines.pipelineNumber', { id: pipelineId })}
                </h3>
                {kindLabel && (
                  <span className="text-fg-muted text-xs">{kindLabel}</span>
                )}
                {pipeline?.status && (
                  <PipelineStatus status={pipeline.status} />
                )}
              </div>
            )}
            {(description || pipeline?.ref) && (
              <div className="min-w-0 text-fg-muted text-xs [overflow-wrap:anywhere]">
                {description ?? (
                  <span className="font-mono">{pipeline?.ref}</span>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="glass-control inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 font-semibold text-sm"
                type="button"
                aria-label={t('pipelines.refresh')}
                aria-busy={refreshing}
                disabled={refreshing}
                onClick={model.refresh}
              >
                <ArrowsRotateRight className="size-4" aria-hidden />
                {t('pipelines.refresh')}
              </button>
              {actions}
              {pipeline?.web_url && (
                <a
                  className="inline-flex items-center gap-1 rounded-sm text-fg-link text-xs hover:underline"
                  href={pipeline.web_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('common.openInGitLab')}{' '}
                  <ArrowUpRightFromSquare className="size-3" aria-hidden />
                </a>
              )}
            </div>
            {loading && (
              <p role="status" className="text-fg-muted text-sm">
                {t('pipelines.loadingJobs')}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="whitespace-pre-line text-[var(--color-danger-fg)] text-sm"
              >
                {error}
              </p>
            )}
            {!loading && !error && jobs.length === 0 && (
              <p className="text-fg-muted text-sm">
                {t('pipelines.thisPipelineHasNoJobs')}
              </p>
            )}
            {manager && jobs.length > 0 && (
              <div className="pipeline-manager-tools">
                <input
                  className="glass-input min-w-0 rounded-md px-2.5 py-1.5 text-sm"
                  type="search"
                  aria-label={t('pipelines.filterJobs')}
                  placeholder={t('pipelines.filterJobs')}
                  value={model.jobSearch}
                  onChange={(event) => model.setJobSearch(event.target.value)}
                />
                <select
                  className="glass-control min-w-0 rounded-md px-2 py-1.5 text-sm"
                  aria-label={t('pipelines.status')}
                  value={model.jobStatus}
                  onChange={(event) => model.setJobStatus(event.target.value)}
                >
                  <option value="">{t('pipelines.allStatuses')}</option>
                  {model.jobStatuses.map((status) => (
                    <option key={status} value={status}>
                      {pipelineStatusLabel(status)}
                    </option>
                  ))}
                </select>
                <span role="status" className="text-fg-muted text-xs">
                  {t('pipelines.jobResults', {
                    visible: model.visibleJobs.length,
                    total: jobs.length,
                  })}
                </span>
              </div>
            )}
            {jobs.length > 0 && model.visibleJobs.length === 0 && (
              <p className="text-fg-muted text-sm">
                {t('pipelines.noMatchingJobs')}
              </p>
            )}
            {model.visibleJobs.length > 0 && (
              <PipelineStageGraph model={model} detailsId={detailsId} />
            )}
            <div id={detailsId} hidden={!selectedJob}>
              {selectedJob && (
                <div key={selectedJob.id} ref={model.revealJobDetails}>
                  <PipelineJobDetails projectId={projectId} job={selectedJob} />
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassDialog>
    );
  },
);
