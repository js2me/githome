import {
  ArrowUpRightFromSquare,
  ChevronDown,
  CircleCheckFill,
  CircleDashed,
  CircleMinus,
  CirclePause,
  CirclePlay,
  CircleXmarkFill,
  Clock,
} from "@gravity-ui/icons";
import { observer } from "mobx-react-lite";
import { withViewModel } from "mobx-view-model-react";
import { useId, useState } from "react";
import type { GitLabJobDC } from "@/shared/api/gitlab";
import { PipelineCardVM } from "./model";

interface StatusAppearance {
  label: string;
  icon: typeof Clock;
  color?: string;
  needsAttention?: boolean;
}

const pending = { icon: Clock, color: "text-[var(--glass-accent)]" };
const statuses: Record<string, StatusAppearance> = {
  success: { label: "Успешно", icon: CircleCheckFill, color: "text-[var(--color-success-fg)]" },
  failed: { label: "Ошибка", icon: CircleXmarkFill, color: "text-[var(--color-danger-fg)]", needsAttention: true },
  running: { label: "Выполняется", icon: CirclePlay, color: "text-[var(--color-accent-blue)]" },
  canceled: { label: "Отменено", icon: CircleMinus, needsAttention: true },
  skipped: { label: "Пропущено", icon: CircleMinus },
  manual: { label: "Ручной запуск", icon: CirclePause, color: pending.color, needsAttention: true },
  blocked: { label: "Заблокировано", icon: CirclePause, color: pending.color, needsAttention: true },
  created: { label: "Создано", ...pending },
  scheduled: { label: "Запланировано", ...pending },
  preparing: { label: "Подготовка", ...pending },
  pending: { label: "В очереди", ...pending },
  waiting_for_resource: { label: "Ожидание ресурса", ...pending },
  waiting_for_callback: { label: "Ожидание ответа", ...pending },
};

const statusAppearance = (status: string): StatusAppearance =>
  statuses[status] ?? { label: status.replaceAll("_", " "), icon: CircleDashed };

const Status = ({ label, icon: Icon, color = "text-fg-muted" }: StatusAppearance) => (
  <span className={`inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold ${color}`}>
    <Icon className="size-4 shrink-0" aria-hidden />
    <span>{label}</span>
  </span>
);

const JobRow = observer(({ job, model }: { job: GitLabJobDC; model: PipelineCardVM }) => {
  const action = job.status === "manual" ? "Запустить" : "Повторить";

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 py-2">
      <div className="flex min-w-0 flex-1 basis-24 flex-col items-start gap-1">
        {job.web_url ? (
          <a
            className="max-w-full rounded-sm text-[13px] font-medium text-fg-default hover:underline [overflow-wrap:anywhere]"
            href={job.web_url}
            target="_blank"
            rel="noreferrer"
            title={`Открыть задание ${job.name} в GitLab`}
          >
            {job.name}<ArrowUpRightFromSquare className="ml-1 inline size-3 text-fg-muted" aria-hidden />
          </a>
        ) : (
          <span className="max-w-full text-[13px] font-medium [overflow-wrap:anywhere]">{job.name}</span>
        )}
        <Status {...statusAppearance(job.status)} />
      </div>
      {model.canRun(job) && (
        <button
          className="glass-control min-h-8 rounded-md px-2 text-xs font-semibold"
          type="button"
          disabled={model.busyJobId !== null}
          aria-label={`${action} задание ${job.name}`}
          onClick={() => void model.runJob(job)}
        >
          {model.busyJobId === job.id ? "Запускаем…" : action}
        </button>
      )}
    </li>
  );
});

export const PipelineCard = withViewModel(PipelineCardVM, ({ model }) => {
  const { projectId, pipelineId } = model.payload;
  const { pipeline, pipelineErrorMessage, errorMessage, actionError } = model;
  const detailsId = useId();
  const pipelineKey = `${projectId}/${pipelineId}`;
  const [selection, setSelection] = useState<{ key: string; expanded: boolean } | null>(null);
  const status: StatusAppearance = pipeline?.status
    ? statusAppearance(pipeline.status)
    : { label: model.pipelineQuery.isLoading ? "Загрузка…" : "Статус недоступен", icon: CircleDashed };
  const expanded = selection?.key === pipelineKey
    ? selection.expanded
    : Boolean(status.needsAttention || pipelineErrorMessage || errorMessage || actionError);

  return (
    <section className="min-w-0 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-control)]" aria-label="Последний пайплайн">
      <div className="flex min-w-0 items-center gap-2 px-2.5 py-0.5 sm:gap-3">
        <span className="text-xs font-semibold text-fg-default">Пайплайн</span>
        {pipeline?.web_url ? (
          <a
            className="inline-flex shrink-0 items-center gap-1 rounded-sm py-1 font-mono text-xs text-fg-link hover:underline"
            href={pipeline.web_url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Открыть пайплайн #${pipelineId} в GitLab`}
          >
            #{pipelineId}<ArrowUpRightFromSquare className="size-3" aria-hidden />
          </a>
        ) : (
          <span className="shrink-0 font-mono text-xs text-fg-muted">#{pipelineId}</span>
        )}
        <button
          className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 text-left hover:bg-[var(--glass-hover)]"
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${status.label}. ${expanded ? "Свернуть" : "Показать"} этапы пайплайна`}
          onClick={() => setSelection({ key: pipelineKey, expanded: !expanded })}
        >
          <Status {...status} />
          <ChevronDown className={`size-3.5 shrink-0 text-fg-muted ${expanded ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>
      <div id={detailsId} hidden={!expanded}>
        {expanded && (
          <div className="space-y-2 border-t border-[var(--glass-border)] px-3 py-2.5 text-xs text-fg-muted">
            {pipelineErrorMessage && <p role="alert" className="text-[var(--color-danger-fg)]">{pipelineErrorMessage}</p>}
            {model.isLoading && <p role="status">Загружаем задания…</p>}
            {errorMessage && !model.isLoading && <p role="alert" className="text-[var(--color-danger-fg)]">{errorMessage}</p>}
            {!model.isLoading && !errorMessage && model.jobs.length === 0 && <p>В этом пайплайне нет заданий.</p>}
            {model.stages.length > 0 && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] items-start gap-x-5 gap-y-2">
                {model.stages.map((stage) => (
                  <section key={stage.name} className="min-w-0">
                    <h3 className="border-b border-[var(--glass-border)] pb-1.5 text-xs font-semibold text-fg-muted [overflow-wrap:anywhere]">{stage.name}</h3>
                    <ul className="divide-y divide-[var(--glass-border)] text-fg-default">
                      {stage.jobs.map((job) => <JobRow key={job.id} job={job} model={model} />)}
                    </ul>
                  </section>
                ))}
              </div>
            )}
            {actionError && <p role="alert" className="text-[var(--color-danger-fg)]">Не удалось выполнить действие. {actionError}</p>}
          </div>
        )}
      </div>
    </section>
  );
});
