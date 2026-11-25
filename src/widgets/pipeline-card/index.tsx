import { ArrowUpRightFromSquare, ChevronRight } from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import {
  PipelineStatus,
  pipelineStatusLabel,
} from '@/entities/gitlab-pipelines';
import { PipelineCardVM } from './model';
import { PipelineDetailsDialog } from './pipeline-details-dialog';

export const PipelineCard = withViewModel(PipelineCardVM, ({ model }) => {
  const { pipelineId } = model.payload;
  const { pipeline } = model;
  const status =
    pipeline?.status ??
    (model.pipelineQuery.isLoading ? 'Загрузка…' : 'Статус недоступен');

  return (
    <section
      className="min-w-0 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-control)]"
      aria-label="Последний пайплайн"
    >
      <div className="flex min-w-0 items-center gap-2 px-2.5 py-0.5 sm:gap-3">
        <span className="font-semibold text-fg-default text-xs">Пайплайн</span>
        {pipeline?.web_url ? (
          <a
            className="inline-flex shrink-0 items-center gap-1 rounded-sm py-1 font-mono text-fg-link text-xs hover:underline"
            href={pipeline.web_url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Открыть пайплайн #${pipelineId} в GitLab`}
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
          aria-label={`Открыть детали пайплайна #${pipelineId}. ${pipelineStatusLabel(status)}`}
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
          pipelineId={pipelineId}
          pipeline={pipeline}
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
          renderJobActions={(job) => {
            if (!model.canRun(job)) return null;
            const action = job.status === 'manual' ? 'Запустить' : 'Повторить';
            return (
              <button
                className="glass-control min-h-8 rounded-md px-2 font-semibold text-xs"
                type="button"
                disabled={model.busyJobId !== null}
                aria-label={`${action} задание ${job.name}`}
                onClick={() => void model.runJob(job)}
              >
                {model.busyJobId === job.id ? 'Запускаем…' : action}
              </button>
            );
          }}
        />
      )}
    </section>
  );
});

export { PipelineDetailsDialog } from './pipeline-details-dialog';
