import { withViewModel } from "mobx-view-model-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { gitlabApi } from "@/shared/api/gitlab";
import type { GitLabJobDC, GitLabPipelineDC } from "@/shared/api/gitlab";
import { StatusMessage } from "@/shared/ui/status-message";
import { getPipelineMergeRequestIid } from "@/entities/gitlab-pipelines/model/pipeline-list";
import { PipelinesPageVM } from "../model";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  canceled: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  canceling: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  skipped: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  created: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  preparing: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  waiting_for_resource: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  waiting_for_callback: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  manual: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

const STATUS_OPTIONS = [
  ["", "Все статусы"],
  ["created", "Created"],
  ["waiting_for_resource", "Waiting for resource"],
  ["preparing", "Preparing"],
  ["waiting_for_callback", "Waiting for callback"],
  ["running", "Running"],
  ["pending", "Pending"],
  ["success", "Success"],
  ["failed", "Failed"],
  ["canceling", "Canceling"],
  ["canceled", "Canceled"],
  ["skipped", "Skipped"],
  ["manual", "Manual"],
  ["scheduled", "Scheduled"],
] as const;

const BUTTON_CLASS =
  "cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-gray-900 dark:text-slate-200";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (duration?: number | null) => {
  if (duration == null || !Number.isFinite(duration)) {
    return null;
  }

  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return minutes > 0 ? `${minutes} мин ${seconds} с` : `${seconds} с`;
};

const groupJobsByStage = (jobs: GitLabJobDC[]) => {
  const stageMap = new Map<string, GitLabJobDC[]>();

  for (const job of [...jobs].reverse()) {
    const stageJobs = stageMap.get(job.stage) ?? [];
    stageJobs.push(job);
    stageMap.set(job.stage, stageJobs);
  }

  return [...stageMap].map(([name, stageJobs]) => ({
    name,
    jobs: stageJobs,
  }));
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
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
  isTraceOpen,
  jobTrace,
  isJobTraceLoading,
  jobTraceError,
  onToggleTrace,
  onRunJob,
}: {
  job: GitLabJobDC;
  model: PipelinesPageVM["pipelineList"];
  isTraceOpen: boolean;
  jobTrace: string;
  isJobTraceLoading: boolean;
  jobTraceError: string | null;
  onToggleTrace: () => void;
  onRunJob: (job: GitLabJobDC) => void;
}) => {
  const canPlay = job.status === "manual" && model.canRunJob(job);
  const canRetry =
    (job.status === "failed" || job.status === "canceled") &&
    model.canRunJob(job);
  const canCancel = model.isJobCancelable(job);
  const isBusy = model.busyJobId === job.id;

  return (
    <li className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
            {job.name}
          </span>
          <span className="text-xs text-slate-500">
            {job.failure_reason?.replaceAll("_", " ") ?? job.stage}
          </span>
        </span>

        {job.web_url && (
          <a
            className="text-xs font-semibold text-brand hover:underline"
            href={job.web_url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            GitLab ↗
          </a>
        )}

        <StatusBadge status={job.status} />

        {(canPlay || canRetry || canCancel) && (
          <button
            className={BUTTON_CLASS}
            type="button"
            disabled={model.busyJobId !== null || model.busyPipelineId !== null}
            onClick={() => onRunJob(job)}
          >
            {isBusy
              ? canCancel
                ? "Останавливаем..."
                : "Запускаем..."
              : canPlay
                ? "Запустить"
                : canRetry
                  ? "Повторить"
                  : "Остановить"}
          </button>
        )}

        <button
          className={BUTTON_CLASS}
          type="button"
          onClick={onToggleTrace}
        >
          {isTraceOpen ? "Скрыть лог" : "Лог"}
        </button>
      </div>

      {isTraceOpen && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          {isJobTraceLoading && (
            <p className="m-0 text-sm text-slate-500">Загружаем лог...</p>
          )}
          {jobTraceError && !isJobTraceLoading && (
            <p className="m-0 text-sm text-red-600 dark:text-red-300">
              {jobTraceError}
            </p>
          )}
          {!isJobTraceLoading && !jobTraceError && (
            <pre className="m-0 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200">
              {jobTrace || "Лог пока пуст."}
            </pre>
          )}
        </div>
      )}
    </li>
  );
};

const PipelineRow = ({
  pipeline,
  model,
  isExpanded,
  onToggle,
  jobs,
  isJobsLoading,
  jobsErrorMessage,
  selectedJobTraceId,
  jobTrace,
  isJobTraceLoading,
  jobTraceError,
  onToggleJobTrace,
  onRunJob,
  onPipelineAction,
}: {
  pipeline: GitLabPipelineDC;
  model: PipelinesPageVM["pipelineList"];
  isExpanded: boolean;
  onToggle: () => void;
  jobs: GitLabJobDC[];
  isJobsLoading: boolean;
  jobsErrorMessage: string | null;
  selectedJobTraceId: number | null;
  jobTrace: string;
  isJobTraceLoading: boolean;
  jobTraceError: string | null;
  onToggleJobTrace: (job: GitLabJobDC) => void;
  onRunJob: (job: GitLabJobDC) => void;
  onPipelineAction: (pipeline: GitLabPipelineDC, action: "cancel" | "retry") => void;
}) => {
  const duration = formatDuration(pipeline.duration);
  const canCancel = model.isPipelineCancelable(pipeline);
  const canRetry = model.isPipelineRetryable(pipeline);
  const isBusy = model.busyPipelineId === pipeline.id;
  const mergeRequestIid = getPipelineMergeRequestIid(pipeline);
  const mergeRequest = model.mergeRequestForPipeline(pipeline);

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3.5">
        <button
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 border-0 bg-transparent p-0 text-left"
          type="button"
          onClick={onToggle}
        >
          <span className="flex w-full flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-slate-500">Pipeline</span>
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900 dark:text-slate-200">
              {mergeRequest ? (
                <span>{mergeRequest.title}</span>
              ) : mergeRequestIid !== null ? (
                <span>Merge request !{mergeRequestIid}</span>
              ) : (
                <span className="font-mono">{pipeline.ref}</span>
              )}
            </span>
            <StatusBadge status={pipeline.status} />
            <span className="ml-1 text-slate-400" aria-hidden="true">
              {isExpanded ? "−" : "+"}
            </span>
          </span>

          <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="font-semibold">#{pipeline.id}</span>
            <span className="font-mono">{pipeline.sha.slice(0, 8)}</span>
            <span className="font-mono">{pipeline.ref}</span>
            <span>{formatDate(pipeline.updated_at ?? pipeline.created_at)}</span>
            {duration && <span>{duration}</span>}
            {pipeline.user?.name && <span>{pipeline.user.name}</span>}
            {pipeline.source && <span>{pipeline.source}</span>}
          </span>
        </button>

        <a
          className="text-xs font-semibold text-brand hover:underline"
          href={pipeline.web_url}
          target="_blank"
          rel="noreferrer"
        >
          GitLab ↗
        </a>

        {mergeRequestIid !== null && (
          <button
            className={BUTTON_CLASS}
            type="button"
            onClick={() => model.openMergeRequest(mergeRequestIid)}
          >
            Открыть MR !{mergeRequestIid}
          </button>
        )}

        {canCancel && (
          <button
            className={BUTTON_CLASS}
            type="button"
            disabled={model.busyPipelineId !== null || model.busyJobId !== null}
            onClick={() => onPipelineAction(pipeline, "cancel")}
          >
            {isBusy ? "Останавливаем..." : "Остановить"}
          </button>
        )}
        {canRetry && (
          <button
            className={BUTTON_CLASS}
            type="button"
            disabled={model.busyPipelineId !== null || model.busyJobId !== null}
            onClick={() => onPipelineAction(pipeline, "retry")}
          >
            {isBusy ? "Перезапускаем..." : "Повторить pipeline"}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="m-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
              Stages и jobs
            </h3>
            <a
              className="text-xs font-semibold text-brand hover:underline"
              href={pipeline.web_url}
              target="_blank"
              rel="noreferrer"
            >
              Открыть в GitLab ↗
            </a>
          </div>

          {isJobsLoading && (
            <p className="m-0 text-sm text-slate-500">Загружаем jobs...</p>
          )}

          {jobsErrorMessage && !isJobsLoading && (
            <p className="m-0 text-sm text-red-600 dark:text-red-300">
              {jobsErrorMessage}
            </p>
          )}

          {!isJobsLoading && !jobsErrorMessage && jobs.length === 0 && (
            <p className="m-0 text-sm text-slate-500">В pipeline нет jobs.</p>
          )}

          {!isJobsLoading &&
            !jobsErrorMessage &&
            jobs.length > 0 && (
            <div className="flex flex-col gap-4">
              {groupJobsByStage(jobs).map((stage) => (
                <section key={stage.name}>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {stage.name}
                  </h4>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {stage.jobs.map((job) => (
                      <JobRow
                        key={job.id}
                        job={job}
                        model={model}
                        isTraceOpen={selectedJobTraceId === job.id}
                        jobTrace={jobTrace}
                        isJobTraceLoading={isJobTraceLoading}
                        jobTraceError={jobTraceError}
                        onToggleTrace={() => onToggleJobTrace(job)}
                        onRunJob={onRunJob}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {model.actionError && (
            <p className="mt-3 mb-0 text-sm text-red-600 dark:text-red-300">
              Действие не выполнено: {model.actionError}
            </p>
          )}
        </div>
      )}
    </li>
  );
};

export const PipelinesPage = withViewModel(PipelinesPageVM, ({ model }) => {
  const { pipelineList } = model;
  const [expandedPipelineId, setExpandedPipelineId] =
    useState<number | null>(null);
  const [jobsByPipeline, setJobsByPipeline] = useState<
    Record<number, GitLabJobDC[]>
  >({});
  const [jobsLoadingIds, setJobsLoadingIds] = useState<number[]>([]);
  const [jobsErrors, setJobsErrors] = useState<Record<number, string>>({});
  const [selectedJobTraceId, setSelectedJobTraceId] = useState<number | null>(
    null,
  );
  const [jobTrace, setJobTrace] = useState("");
  const [jobTraceLoading, setJobTraceLoading] = useState(false);
  const [jobTraceError, setJobTraceError] = useState<string | null>(null);
  const jobLoadsInFlight = useRef(new Set<number>());
  const jobTraceRequestId = useRef(0);
  const connection = model.globals.stores.settings.activeConnection;

  const loadPipelineJobs = useCallback(
    async (pipeline: GitLabPipelineDC) => {
      if (!connection || jobLoadsInFlight.current.has(pipeline.id)) {
        return;
      }

      jobLoadsInFlight.current.add(pipeline.id);
      setJobsLoadingIds((ids) =>
        ids.includes(pipeline.id) ? ids : [...ids, pipeline.id],
      );
      setJobsErrors((errors) => {
        const next = { ...errors };
        delete next[pipeline.id];
        return next;
      });

      try {
        const jobs = await gitlabApi.fetch<GitLabJobDC[]>(
          connection,
          `/projects/${pipeline.project_id}/pipelines/${pipeline.id}/jobs`,
          {
            query: { per_page: 100, include_retried: false },
            signal: model.unmountSignal,
          },
        );
        setJobsByPipeline((current) => ({ ...current, [pipeline.id]: jobs }));
      } catch (error) {
        setJobsErrors((current) => ({
          ...current,
          [pipeline.id]:
            error instanceof Error ? error.message : "Не удалось загрузить jobs",
        }));
      } finally {
        jobLoadsInFlight.current.delete(pipeline.id);
        setJobsLoadingIds((ids) => ids.filter((id) => id !== pipeline.id));
      }
    },
    [connection, model],
  );

  useEffect(() => {
    if (expandedPipelineId === null) {
      return;
    }

    const pipeline = pipelineList.pipelines.find(
      (item) => item.id === expandedPipelineId,
    );
    if (!pipeline) {
      return;
    }

    const intervalId = setInterval(() => {
      void loadPipelineJobs(pipeline);
    }, 5000);
    return () => clearInterval(intervalId);
  }, [expandedPipelineId, loadPipelineJobs, pipelineList]);

  useEffect(
    () => () => {
      jobTraceRequestId.current += 1;
    },
    [],
  );

  const togglePipeline = (pipeline: GitLabPipelineDC) => {
    const willExpand = expandedPipelineId !== pipeline.id;
    setExpandedPipelineId(willExpand ? pipeline.id : null);
    pipelineList.togglePipeline(pipeline);
    setSelectedJobTraceId(null);
    setJobTrace("");
    setJobTraceError(null);
    setJobTraceLoading(false);
    jobTraceRequestId.current += 1;
    if (willExpand) {
      void loadPipelineJobs(pipeline);
    }
  };

  const toggleJobTrace = async (job: GitLabJobDC) => {
    if (selectedJobTraceId === job.id) {
      jobTraceRequestId.current += 1;
      setSelectedJobTraceId(null);
      setJobTrace("");
      setJobTraceError(null);
      setJobTraceLoading(false);
      return;
    }

    const selectedPipeline = pipelineList.pipelines.find(
      (pipeline) => pipeline.id === expandedPipelineId,
    );
    if (!connection || !selectedPipeline) {
      return;
    }

    const requestId = ++jobTraceRequestId.current;
    setSelectedJobTraceId(job.id);
    setJobTrace("");
    setJobTraceError(null);
    setJobTraceLoading(true);

    try {
      const trace = await gitlabApi.getPipelineJobTrace(
        connection,
        selectedPipeline.project_id,
        job.id,
        model.unmountSignal,
      );
      if (jobTraceRequestId.current === requestId) {
        setJobTrace(trace);
      }
    } catch (error) {
      if (jobTraceRequestId.current === requestId) {
        setJobTraceError(
          error instanceof Error ? error.message : "Не удалось загрузить лог",
        );
      }
    } finally {
      if (jobTraceRequestId.current === requestId) {
        setJobTraceLoading(false);
      }
    }
  };

  const runJob = async (job: GitLabJobDC) => {
    await pipelineList.runJobAction(job);
    const pipeline = pipelineList.pipelines.find(
      (item) => item.id === expandedPipelineId,
    );
    if (pipeline) {
      await loadPipelineJobs(pipeline);
    }
  };

  const runPipelineAction = async (
    pipeline: GitLabPipelineDC,
    action: "cancel" | "retry",
  ) => {
    await pipelineList.runPipelineAction(pipeline, action);
    if (pipeline.id === expandedPipelineId) {
      await loadPipelineJobs(pipeline);
    }
  };

  const refresh = () => {
    pipelineList.refresh();
    const pipeline = pipelineList.pipelines.find(
      (item) => item.id === expandedPipelineId,
    );
    if (pipeline) {
      void loadPipelineJobs(pipeline);
    }
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[22px] font-semibold">Pipelines</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className={BUTTON_CLASS}
            type="button"
            onClick={refresh}
          >
            Обновить
          </button>
          {pipelineList.canManagePipelines && (
            <button
              className={BUTTON_CLASS}
              type="button"
              onClick={pipelineList.toggleCreateForm}
            >
              {pipelineList.isCreateFormOpen ? "Закрыть" : "Запустить pipeline"}
            </button>
          )}
        </div>
      </div>

      {!pipelineList.canManagePipelines && (
        <StatusMessage>
          Просмотр доступен, но для управления pipelines нужны права Developer или выше.
        </StatusMessage>
      )}

      {pipelineList.isCreateFormOpen && (
        <form
          className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-gray-900"
          onSubmit={(event) => {
            event.preventDefault();
            void pipelineList.createPipeline();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ветка, тег или commit SHA
            <input
              autoComplete="off"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-gray-950"
              required
              value={pipelineList.pipelineRef}
              onChange={(event) => pipelineList.setPipelineRef(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Variables (по одной KEY=VALUE на строку)
            <textarea
              className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-normal dark:border-slate-700 dark:bg-gray-950"
              placeholder={"ENV=staging\nRUN_E2E=true"}
              value={pipelineList.variablesText}
              onChange={(event) => pipelineList.setVariablesText(event.target.value)}
            />
          </label>

          {pipelineList.createPipelineError && (
            <p className="m-0 text-sm text-red-600 dark:text-red-300">
              {pipelineList.createPipelineError}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              className={BUTTON_CLASS}
              type="submit"
              disabled={pipelineList.isCreatingPipeline}
            >
              {pipelineList.isCreatingPipeline ? "Запускаем..." : "Запустить"}
            </button>
            <button
              className={BUTTON_CLASS}
              type="button"
              disabled={pipelineList.isCreatingPipeline}
              onClick={pipelineList.toggleCreateForm}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Статус
          <select
            className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-gray-900 dark:text-slate-200"
            value={pipelineList.statusFilter}
            onChange={(event) => pipelineList.setStatusFilter(event.target.value)}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            pipelineList.applyRefFilter();
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            Ветка или тег
            <input
              className="min-w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-gray-900 dark:text-slate-200"
              placeholder="Например, main"
              value={pipelineList.refSearch}
              onChange={(event) => pipelineList.setRefSearch(event.target.value)}
            />
          </label>
          <button className={BUTTON_CLASS} type="submit">
            Фильтровать
          </button>
          {pipelineList.refFilter && (
            <button
              className={BUTTON_CLASS}
              type="button"
              onClick={() => {
                pipelineList.setRefSearch("");
                pipelineList.applyRefFilter();
              }}
            >
              Сбросить
            </button>
          )}
        </form>
      </div>

      {pipelineList.isLoading && (
        <StatusMessage>Загружаем pipelines...</StatusMessage>
      )}

      {pipelineList.showLoadError && (
        <StatusMessage error>{pipelineList.errorMessage}</StatusMessage>
      )}

      {pipelineList.showEmptyListMessage && (
        <StatusMessage>Подходящих pipelines не найдено.</StatusMessage>
      )}

      {pipelineList.pipelines.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {pipelineList.pipelines.map((pipeline) => (
            <PipelineRow
              key={pipeline.id}
              pipeline={pipeline}
              model={pipelineList}
              isExpanded={expandedPipelineId === pipeline.id}
              onToggle={() => togglePipeline(pipeline)}
              jobs={jobsByPipeline[pipeline.id] ?? []}
              isJobsLoading={
                jobsLoadingIds.includes(pipeline.id) &&
                (jobsByPipeline[pipeline.id]?.length ?? 0) === 0
              }
              jobsErrorMessage={jobsErrors[pipeline.id] ?? null}
              selectedJobTraceId={selectedJobTraceId}
              jobTrace={jobTrace}
              isJobTraceLoading={jobTraceLoading}
              jobTraceError={jobTraceError}
              onToggleJobTrace={toggleJobTrace}
              onRunJob={runJob}
              onPipelineAction={runPipelineAction}
            />
          ))}
        </ul>
      )}

      {pipelineList.canLoadMore && (
        <button
          className={`${BUTTON_CLASS} mt-4`}
          type="button"
          disabled={pipelineList.isFetchingNextPage}
          onClick={pipelineList.loadMore}
        >
          {pipelineList.isFetchingNextPage
            ? "Загружаем..."
            : pipelineList.canLoadMoreLabel}
        </button>
      )}

      {pipelineList.actionError && !pipelineList.selectedPipelineId && (
        <StatusMessage error>{pipelineList.actionError}</StatusMessage>
      )}
    </section>
  );
});
