import { ArrowUpRightFromSquare, Xmark } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { useId } from 'react';
import { PipelineStatus } from '@/entities/gitlab-pipelines';
import { GlassDialog } from '@/shared/ui/glass-dialog';
import { PipelineDetailsDialogVM } from './model/details-dialog';

export const PipelineDetailsDialog = withPropsViewModel(
  PipelineDetailsDialogVM,
  ({ model }) => {
    const {
      pipelineId,
      pipeline,
      jobs,
      loading,
      error,
      description,
      actions,
      renderJobActions,
      renderJobDetails,
      onClose,
    } = model.payload;
    const titleId = useId();

    return (
      <GlassDialog
        ref={model.dialog}
        aria-labelledby={titleId}
        onClose={(event) => {
          if (!event.currentTarget.open) onClose();
        }}
        className="max-h-[min(46rem,calc(100dvh-1.5rem))] w-[min(44rem,calc(100%-1.5rem))] max-w-none overflow-hidden p-0 open:flex open:flex-col"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-[var(--glass-border)] border-b px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2
              id={titleId}
              className="break-words font-semibold text-lg tracking-tight"
            >
              Пайплайн #{pipelineId}
            </h2>
            {pipeline?.status && <PipelineStatus status={pipeline.status} />}
          </div>
          <button
            ref={model.closeButton}
            type="button"
            className="glass-control grid size-8 shrink-0 place-items-center rounded-lg"
            aria-label="Закрыть детали пайплайна"
            onClick={() => model.dialog.current?.close()}
          >
            <Xmark className="size-4" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 min-w-0 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4">
          {(description || pipeline?.ref) && (
            <div className="min-w-0 text-fg-muted text-xs [overflow-wrap:anywhere]">
              {description ?? (
                <span className="font-mono">{pipeline?.ref}</span>
              )}
            </div>
          )}
          {(actions || pipeline?.web_url) && (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              {pipeline?.web_url && (
                <a
                  className="inline-flex items-center gap-1 rounded-sm text-fg-link text-xs hover:underline"
                  href={pipeline.web_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть в GitLab{' '}
                  <ArrowUpRightFromSquare className="size-3" aria-hidden />
                </a>
              )}
            </div>
          )}
          {loading && (
            <p role="status" className="text-fg-muted text-sm">
              Загружаем задания…
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
              В этом пайплайне нет заданий.
            </p>
          )}
          {[...model.stages].map(([stage, stageJobs]) => (
            <section
              key={stage}
              className="min-w-0 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-control)]"
            >
              <h3 className="rounded-t-xl border-[var(--glass-border)] border-b bg-[var(--glass-hover)] px-3 py-2 font-semibold text-xs [overflow-wrap:anywhere]">
                {stage}
              </h3>
              <ul className="divide-y divide-[var(--glass-border)]">
                {stageJobs.map((job) => (
                  <li key={job.id} className="min-w-0 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="min-w-0 flex-1 basis-28 font-medium text-sm [overflow-wrap:anywhere]">
                        {job.web_url ? (
                          <a
                            className="rounded-sm hover:underline"
                            href={job.web_url}
                            target="_blank"
                            rel="noreferrer"
                            title={`Открыть задание ${job.name} в GitLab`}
                          >
                            {job.name}
                            <ArrowUpRightFromSquare
                              className="ml-1 inline size-3 text-fg-muted"
                              aria-hidden
                            />
                          </a>
                        ) : (
                          job.name
                        )}
                      </div>
                      <PipelineStatus status={job.status} />
                      {renderJobActions?.(job)}
                    </div>
                    {renderJobDetails?.(job)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </GlassDialog>
    );
  },
);
