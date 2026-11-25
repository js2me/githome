import { ArrowUpRightFromSquare, Xmark } from "@gravity-ui/icons";
import { observer } from "mobx-react-lite";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import type { GitLabJobDC, GitLabPipelineDC } from "@/shared/api/gitlab";
import { GlassDialog } from "@/shared/ui/glass-dialog";
import { PipelineStatus } from "./pipeline-status";

interface PipelineDetailsDialogProps {
  pipelineId: number;
  pipeline?: GitLabPipelineDC;
  jobs: readonly GitLabJobDC[];
  loading: boolean;
  error?: string | null;
  description?: ReactNode;
  actions?: ReactNode;
  renderJobActions?: (job: GitLabJobDC) => ReactNode;
  renderJobDetails?: (job: GitLabJobDC) => ReactNode;
  onClose: () => void;
}

const groupJobsByStage = (jobs: readonly GitLabJobDC[]) => {
  const stages = new Map<string, GitLabJobDC[]>();
  for (const job of [...jobs].reverse()) {
    const stage = stages.get(job.stage);
    if (stage) stage.push(job);
    else stages.set(job.stage, [job]);
  }
  return stages;
};

export const PipelineDetailsDialog = observer(({
  pipelineId, pipeline, jobs, loading, error, description, actions,
  renderJobActions, renderJobDetails, onClose,
}: PipelineDetailsDialogProps) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  return (
    <GlassDialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={event => { if (!event.currentTarget.open) onClose(); }}
      className="max-h-[min(46rem,calc(100dvh-1.5rem))] w-[min(44rem,calc(100%-1.5rem))] max-w-none overflow-hidden p-0 open:flex open:flex-col"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id={titleId} className="break-words text-lg font-semibold tracking-tight">Пайплайн #{pipelineId}</h2>
          {pipeline?.status && <PipelineStatus status={pipeline.status} />}
        </div>
        <button ref={closeRef} type="button" className="glass-control grid size-8 shrink-0 place-items-center rounded-lg"
          aria-label="Закрыть детали пайплайна" onClick={() => dialogRef.current?.close()}>
          <Xmark className="size-4" aria-hidden />
        </button>
      </header>
      <div className="min-h-0 min-w-0 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4">
        {(description || pipeline?.ref) && (
          <div className="min-w-0 text-xs text-fg-muted [overflow-wrap:anywhere]">
            {description ?? <span className="font-mono">{pipeline?.ref}</span>}
          </div>
        )}
        {(actions || pipeline?.web_url) && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {pipeline?.web_url && (
              <a className="inline-flex items-center gap-1 rounded-sm text-xs text-fg-link hover:underline" href={pipeline.web_url} target="_blank" rel="noreferrer">
                Открыть в GitLab <ArrowUpRightFromSquare className="size-3" aria-hidden />
              </a>
            )}
          </div>
        )}
        {loading && <p role="status" className="text-sm text-fg-muted">Загружаем задания…</p>}
        {error && <p role="alert" className="whitespace-pre-line text-sm text-[var(--color-danger-fg)]">{error}</p>}
        {!loading && !error && jobs.length === 0 && <p className="text-sm text-fg-muted">В этом пайплайне нет заданий.</p>}
        {[...groupJobsByStage(jobs)].map(([stage, stageJobs]) => (
          <section key={stage} className="min-w-0 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-control)]">
            <h3 className="rounded-t-xl border-b border-[var(--glass-border)] bg-[var(--glass-hover)] px-3 py-2 text-xs font-semibold [overflow-wrap:anywhere]">
              {stage}
            </h3>
            <ul className="divide-y divide-[var(--glass-border)]">
              {stageJobs.map(job => (
                <li key={job.id} className="min-w-0 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="min-w-0 flex-1 basis-28 text-sm font-medium [overflow-wrap:anywhere]">
                      {job.web_url ? (
                        <a className="rounded-sm hover:underline" href={job.web_url} target="_blank" rel="noreferrer"
                          title={`Открыть задание ${job.name} в GitLab`}>
                          {job.name}<ArrowUpRightFromSquare className="ml-1 inline size-3 text-fg-muted" aria-hidden />
                        </a>
                      ) : job.name}
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
});
