import { withViewModel } from "mobx-view-model-react";
import type { GitLabJobDC } from "@/shared/api/gitlab";
import { PipelineCardVM } from "./model";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  canceled: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  skipped: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  created: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  manual: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
      STATUS_STYLES[status] ??
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    }`}
  >
    {status.replaceAll("_", " ")}
  </span>
);

const JobRow = ({
  job,
  model,
}: {
  job: GitLabJobDC;
  model: PipelineCardVM;
}) => {
  const isBusy = model.busyJobId === job.id;

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
          {job.name}
        </span>
      </span>

      {job.web_url && (
        <a
          className="text-xs font-semibold text-brand hover:underline"
          href={job.web_url}
          target="_blank"
          rel="noreferrer"
        >
          GitLab ↗
        </a>
      )}

      <StatusBadge status={job.status} />

      {model.canRun(job) && (
        <button
          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand hover:text-brand disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-gray-900 dark:text-slate-200"
          type="button"
          disabled={model.busyJobId !== null}
          onClick={() => void model.runJob(job)}
        >
          {isBusy
            ? "Запускаем..."
            : job.status === "manual"
              ? "Запустить"
              : "Повторить"}
        </button>
      )}
    </li>
  );
};

export const PipelineCard = withViewModel(
  PipelineCardVM,
  ({ model }) => {
    const { pipelineId } = model.payload;
    const pipeline = model.pipeline;

    return (
      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-fg-muted">Последний pipeline:</span>
          {pipeline?.web_url ? (
            <a
              className="font-semibold text-fg-default no-underline hover:underline"
              href={pipeline.web_url}
              target="_blank"
              rel="noreferrer"
            >
              #{pipelineId}
            </a>
          ) : (
            <span className="font-semibold text-fg-default">#{pipelineId}</span>
          )}
          {pipeline ? (
            <StatusBadge status={pipeline.status} />
          ) : model.pipelineQuery.isLoading ? (
            <span className="text-slate-500">Загружаем статус...</span>
          ) : null}
        </div>

        {model.pipelineErrorMessage && (
          <p className="m-0 text-sm text-red-600 dark:text-red-300">
            {model.pipelineErrorMessage}
          </p>
        )}

        {model.isLoading && (
          <p className="m-0 text-sm text-slate-500">Загружаем jobs...</p>
        )}

        {model.errorMessage && !model.isLoading && (
          <p className="m-0 text-sm text-red-600 dark:text-red-300">
            {model.errorMessage}
          </p>
        )}

        {!model.isLoading && !model.errorMessage && model.jobs.length === 0 && (
          <p className="m-0 text-sm text-slate-500">В pipeline нет jobs.</p>
        )}

        {model.stages.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-start gap-3">
            {model.stages.map((stage) => (
              <section
                key={stage.name}
                className="min-w-0 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-gray-900"
              >
                <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {stage.name}
                </h3>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {stage.jobs.map((job) => (
                    <JobRow key={job.id} job={job} model={model} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {model.actionError && (
          <p className="m-0 text-sm text-red-600 dark:text-red-300">
            Не удалось выполнить действие: {model.actionError}
          </p>
        )}
      </section>
    );
  },
);
