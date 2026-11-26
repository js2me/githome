import {
  ArrowRotateRight,
  ArrowsRotateRight,
  ArrowUpRightFromSquare,
  ChevronRight,
  CircleStop,
  CodeCommit,
  CodeFork,
  CodePullRequest,
  Magnifier,
  Play,
  Timeline,
  Xmark,
} from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { withViewModel } from 'mobx-view-model-react';
import {
  PipelineStatus,
  pipelineStatusLabel,
} from '@/entities/gitlab-pipelines';
import type { GitLabJobDC, GitLabPipelineDC } from '@/shared/api/gitlab';
import { StatusMessage } from '@/shared/ui/status-message';
import { PipelineDetailsDialog } from '@/widgets/pipeline-card';
import { PipelinesPageVM } from '../model';
import { getPipelineMergeRequestIid } from '../model/pipeline-list';
import './styles.css';

const filterStatuses = [
  'running',
  'pending',
  'success',
  'failed',
  'manual',
  'canceled',
  'skipped',
  'scheduled',
  'created',
  'preparing',
  'waiting_for_resource',
  'waiting_for_callback',
  'canceling',
];
const sources: Record<string, string> = {
  push: 'Обновление ветки или тега',
  web: 'Интерфейс GitLab',
  api: 'API',
  merge_request_event: 'Мерж-реквест',
  schedule: 'Расписание',
  trigger: 'Триггер',
  pipeline: 'Другой пайплайн',
  parent_pipeline: 'Родительский пайплайн',
  chat: 'Чат',
  external: 'Внешний сервис',
  webide: 'Веб-редактор',
  external_pull_request_event: 'Внешний пул-реквест',
};
const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const DateTime = ({ value }: { value: string }) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return <>{value}</>;
  return (
    <time dateTime={value} title={date.toLocaleString('ru-RU')}>
      {dateFormat.format(date)}
    </time>
  );
};
const durationLabel = (seconds?: number | null) => {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return minutes > 0 ? `${minutes} мин ${rest} с` : `${rest} с`;
};
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;
const control =
  'glass-control inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold';

type RunProps = { model: PipelinesPageVM; run: GitLabPipelineDC };

const RunAction = observer(
  ({ model, run, compact = false }: RunProps & { compact?: boolean }) => {
    const list = model.pipelineList;
    const cancel = list.isPipelineCancelable(run);
    if (!cancel && !list.isPipelineRetryable(run)) return null;
    const label = cancel ? 'Остановить' : 'Повторить';
    const Icon = cancel ? CircleStop : ArrowRotateRight;
    const hint = `${label} пайплайн #${run.id}`;
    const busy = list.busyPipelineId === run.id;
    return (
      <button
        type="button"
        className={compact ? 'pipeline-icon-action' : control}
        aria-label={hint}
        title={hint}
        disabled={list.busyJobId !== null || list.busyPipelineId !== null}
        aria-busy={busy}
        onClick={() => void model.runPipeline(run, cancel ? 'cancel' : 'retry')}
      >
        <Icon width={16} height={16} aria-hidden />
        {!compact && (busy ? 'Выполняем…' : label)}
      </button>
    );
  },
);

const RunRow = observer(({ model, run }: RunProps) => {
  const list = model.pipelineList;
  const iid = getPipelineMergeRequestIid(run);
  const mr = list.mergeRequestForPipeline(run);
  const title = mr?.title || (iid !== null ? `Мерж-реквест !${iid}` : run.ref);
  const titleId = `pipeline-title-${run.id}`;
  const statusId = `pipeline-status-${run.id}`;
  const duration = durationLabel(run.duration);
  const RefIcon = iid === null ? CodeFork : CodePullRequest;
  return (
    <li className="pipeline-run">
      <div className="pipeline-identity">
        <span className="pipeline-ref-icon" aria-hidden>
          <RefIcon width={18} height={18} />
        </span>
        <div className="min-w-0">
          <button
            className="pipeline-open"
            type="button"
            aria-haspopup="dialog"
            aria-label={`Открыть пайплайн #${run.id}`}
            aria-describedby={`${titleId} ${statusId}`}
            onClick={() => model.openDetails(run)}
          >
            <span id={titleId}>{title}</span>
          </button>
          <div className="pipeline-meta">
            <span className="font-mono">#{run.id}</span>
            {run.sha && (
              <span
                className="inline-flex items-center gap-1 font-mono"
                title={run.sha}
              >
                <CodeCommit width={13} height={13} aria-hidden />
                {run.sha.slice(0, 8)}
              </span>
            )}
            {mr?.source_branch && (
              <span className="truncate font-mono" title={mr.source_branch}>
                {mr.source_branch}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="pipeline-status" id={statusId}>
        <PipelineStatus status={run.status} />
      </div>
      <div className="pipeline-activity">
        <DateTime value={run.updated_at || run.created_at} />
        {duration && <span className="text-fg-muted text-xs">{duration}</span>}
      </div>
      <div className="pipeline-row-actions">
        {iid !== null && (
          <button
            className="pipeline-mr-link"
            type="button"
            aria-label={`Открыть MR !${iid}`}
            title={`Открыть мерж-реквест !${iid}`}
            onClick={() => list.openMergeRequest(iid)}
          >
            <CodePullRequest width={14} height={14} aria-hidden />!{iid}
          </button>
        )}
        <RunAction model={model} run={run} compact />
        {run.web_url && (
          <a
            className="pipeline-icon-action"
            href={run.web_url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Открыть пайплайн #${run.id} в GitLab`}
            title="Открыть в GitLab"
          >
            <ArrowUpRightFromSquare width={15} height={15} aria-hidden />
          </a>
        )}
      </div>
      <ChevronRight
        className="pipeline-chevron"
        width={15}
        height={15}
        aria-hidden
      />
    </li>
  );
});

const JobActions = observer(
  ({ model, job }: { model: PipelinesPageVM; job: GitLabJobDC }) => {
    const list = model.pipelineList;
    const cancel = list.isJobCancelable(job);
    const label = cancel
      ? 'Остановить'
      : job.status === 'manual'
        ? 'Запустить'
        : 'Повторить';
    const open = model.traceJobId === job.id;
    return (
      <>
        {(cancel || list.canRunJob(job)) && (
          <button
            className={control}
            type="button"
            aria-label={`${label} задание ${job.name}`}
            disabled={list.busyPipelineId !== null || list.busyJobId !== null}
            onClick={() => void model.runJob(job)}
          >
            {list.busyJobId === job.id ? 'Выполняем…' : label}
          </button>
        )}
        <button
          className={control}
          type="button"
          aria-expanded={open}
          aria-label={`Лог задания ${job.name}`}
          onClick={() => model.toggleTrace(job.id)}
        >
          {open ? 'Скрыть лог' : 'Лог'}
        </button>
      </>
    );
  },
);

const JobDetails = observer(
  ({ model, job }: { model: PipelinesPageVM; job: GitLabJobDC }) => (
    <>
      {job.failure_reason && (
        <p className="mt-1 text-fg-muted text-xs">
          Причина сбоя — {job.failure_reason.replaceAll('_', ' ')}
        </p>
      )}
      {model.traceJobId === job.id && (
        <div className="mt-2 min-w-0">
          {model.trace.isLoading ? (
            <p role="status" className="text-fg-muted text-xs">
              Загружаем лог…
            </p>
          ) : model.trace.error ? (
            <p role="alert" className="text-[var(--color-danger-fg)] text-sm">
              {errorText(model.trace.error, 'Не удалось загрузить лог')}
            </p>
          ) : (
            <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-mono text-slate-100 text-xs leading-relaxed [overflow-wrap:anywhere]">
              {model.trace.data || 'Лог пока пуст.'}
            </pre>
          )}
        </div>
      )}
    </>
  ),
);

const RunDetails = observer(({ model, run }: RunProps) => {
  const list = model.pipelineList;
  const iid = getPipelineMergeRequestIid(run);
  const mr = list.mergeRequestForPipeline(run);
  const duration = durationLabel(run.duration);
  const author = run.user?.name || run.user?.username;
  return (
    <PipelineDetailsDialog
      pipelineId={run.id}
      pipeline={run}
      jobs={model.jobs.data ?? []}
      loading={model.jobs.isLoading}
      onClose={model.closeDetails}
      error={
        model.jobs.error
          ? errorText(model.jobs.error, 'Не удалось загрузить задания')
          : null
      }
      description={
        <>
          {mr && (
            <p className="mb-2 font-semibold text-fg-default">{mr.title}</p>
          )}
          <dl className="pipeline-details-meta">
            <div>
              <dt>Ветка или тег</dt>
              <dd className="font-mono">{mr?.source_branch || run.ref}</dd>
            </div>
            {run.sha && (
              <div>
                <dt>Коммит</dt>
                <dd className="font-mono" title={run.sha}>
                  {run.sha.slice(0, 8)}
                </dd>
              </div>
            )}
            {run.source && (
              <div>
                <dt>Источник</dt>
                <dd>{sources[run.source] || run.source}</dd>
              </div>
            )}
            {author && (
              <div>
                <dt>Автор</dt>
                <dd>{author}</dd>
              </div>
            )}
            <div>
              <dt>Обновлён</dt>
              <dd>
                <DateTime value={run.updated_at || run.created_at} />
              </dd>
            </div>
            {duration && (
              <div>
                <dt>Длительность</dt>
                <dd>{duration}</dd>
              </div>
            )}
          </dl>
          {list.actionError && (
            <p
              role="alert"
              className="mt-3 text-[var(--color-danger-fg)] text-sm"
            >
              {list.actionError}
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
              Открыть MR !{iid}
            </button>
          )}
          <RunAction model={model} run={run} />
        </>
      }
      renderJobActions={(job) => <JobActions model={model} job={job} />}
      renderJobDetails={(job) => <JobDetails model={model} job={job} />}
    />
  );
});

export const PipelinesPage = withViewModel(PipelinesPageVM, ({ model }) => {
  const list = model.pipelineList;
  const { selectedPipeline } = list;
  return (
    <section
      className="mx-auto w-full max-w-page"
      aria-labelledby="pipelines-heading"
    >
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="pipelines-heading"
          className="flex items-center gap-3 font-semibold text-2xl tracking-tight sm:text-[30px]"
        >
          <span
            className="grid size-10 place-items-center rounded-xl bg-[var(--glass-selected)] text-[var(--glass-accent)]"
            aria-hidden
          >
            <Timeline width={21} height={21} />
          </span>
          Пайплайны
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={control}
            type="button"
            aria-label="Обновить пайплайны"
            title="Обновить пайплайны"
            onClick={list.refresh}
          >
            <ArrowsRotateRight width={15} height={15} aria-hidden />
            <span className="hidden min-[480px]:inline">Обновить</span>
          </button>
          {list.canManagePipelines && (
            <button
              className="glass-primary inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 font-semibold text-sm"
              type="button"
              aria-expanded={list.isCreateFormOpen}
              onClick={list.toggleCreateForm}
            >
              <Play width={14} height={14} aria-hidden />
              Запустить пайплайн
            </button>
          )}
        </div>
      </header>

      {list.isCreateFormOpen && (
        <form
          className="glass-panel mb-4 grid gap-3 rounded-2xl p-4"
          aria-label="Запуск пайплайна"
          onSubmit={(event) => {
            event.preventDefault();
            void list.createPipeline();
          }}
        >
          <label className="grid gap-1.5 font-semibold text-sm">
            Ветка, тег или SHA коммита
            <input
              className="glass-input min-w-0 rounded-lg px-3 py-2 font-normal"
              autoComplete="off"
              required
              value={list.pipelineRef}
              onChange={(event) => list.setPipelineRef(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 font-semibold text-sm">
            Переменные
            <span className="font-normal text-fg-muted text-xs">
              По одной паре KEY=VALUE на строку
            </span>
            <textarea
              className="glass-input min-h-20 min-w-0 rounded-lg px-3 py-2 font-mono font-normal"
              placeholder="ENV=staging"
              value={list.variablesText}
              onChange={(event) => list.setVariablesText(event.target.value)}
            />
          </label>
          {list.createPipelineError && (
            <p role="alert" className="text-[var(--color-danger-fg)] text-sm">
              {list.createPipelineError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              className={control}
              type="submit"
              disabled={list.isCreatingPipeline}
            >
              {list.isCreatingPipeline ? 'Запускаем…' : 'Запустить'}
            </button>
            <button
              className={control}
              type="button"
              disabled={list.isCreatingPipeline}
              onClick={list.toggleCreateForm}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="glass-panel pipeline-list overflow-hidden rounded-2xl">
        <div className="pipeline-toolbar">
          <label className="grid min-w-0 gap-1.5 font-semibold text-fg-muted text-xs">
            Статус
            <select
              className="glass-input h-9 min-w-0 rounded-lg px-2 font-normal text-fg-default text-sm"
              value={list.statusFilter}
              onChange={(event) => list.setStatusFilter(event.target.value)}
            >
              <option value="">Все статусы</option>
              {filterStatuses.map((status) => (
                <option key={status} value={status}>
                  {pipelineStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <form
            className="flex min-w-0 items-end gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              list.applyRefFilter();
            }}
          >
            <label className="grid min-w-0 flex-1 gap-1.5 font-semibold text-fg-muted text-xs">
              Ветка или тег
              <input
                className="glass-input h-9 min-w-0 rounded-lg px-3 font-normal text-fg-default text-sm"
                type="text"
                placeholder="Например, main"
                value={list.refSearch}
                onChange={(event) => list.setRefSearch(event.target.value)}
              />
            </label>
            <button
              className="glass-control grid size-9 shrink-0 place-items-center rounded-lg"
              type="submit"
              aria-label="Применить фильтр ветки"
              title="Применить фильтр ветки"
            >
              <Magnifier width={16} height={16} aria-hidden />
            </button>
            {list.refFilter && (
              <button
                className="glass-control grid size-9 shrink-0 place-items-center rounded-lg"
                type="button"
                aria-label="Сбросить фильтр ветки"
                title="Сбросить фильтр ветки"
                onClick={() => {
                  list.setRefSearch('');
                  list.applyRefFilter();
                }}
              >
                <Xmark width={15} height={15} aria-hidden />
              </button>
            )}
          </form>
        </div>
        {list.isLoading && (
          <p className="p-8 text-center text-fg-muted text-sm" role="status">
            Загружаем пайплайны…
          </p>
        )}
        {list.showLoadError && (
          <StatusMessage className="m-3" error>
            {list.errorMessage}
          </StatusMessage>
        )}
        {list.showEmptyListMessage && (
          <p className="p-8 text-center text-fg-muted text-sm" role="status">
            {list.statusFilter || list.refFilter
              ? 'По этим фильтрам пайплайнов нет'
              : 'В проекте пока нет пайплайнов'}
          </p>
        )}
        {list.pipelines.length > 0 && (
          <>
            <div className="pipeline-columns" aria-hidden>
              <span>Запуск</span>
              <span>Статус</span>
              <span>Обновлён</span>
            </div>
            <ul
              className="m-0 list-none divide-y divide-[var(--glass-border)] p-0"
              aria-label="Запуски пайплайнов"
            >
              {list.pipelines.map((run) => (
                <RunRow key={run.id} model={model} run={run} />
              ))}
            </ul>
          </>
        )}
        {(list.canLoadMore || list.isFetchingNextPage) && (
          <div className="border-[var(--glass-border)] border-t p-3 text-center">
            <button
              className={control}
              type="button"
              disabled={list.isFetchingNextPage}
              onClick={list.loadMore}
            >
              {list.isFetchingNextPage ? 'Загружаем…' : list.canLoadMoreLabel}
            </button>
          </div>
        )}
      </div>
      {!list.canManagePipelines && (
        <p className="mt-3 text-fg-muted text-xs">
          Для управления пайплайнами нужна роль Developer или выше.
        </p>
      )}
      {list.actionError && !selectedPipeline && (
        <StatusMessage error>{list.actionError}</StatusMessage>
      )}
      {selectedPipeline && <RunDetails model={model} run={selectedPipeline} />}
    </section>
  );
});
