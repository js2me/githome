import {
  ArrowsRotateRight,
  Magnifier,
  Play,
  Timeline,
  Xmark,
} from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { pipelineStatusLabel } from '@/entities/gitlab-pipelines';
import { StatusMessage } from '@/shared/ui/status-message';
import { PipelinesPageVM } from '../model';
import './styles.css';
import { RunDetails } from './components/run-details';
import { control } from './components/run-presentation';
import { RunRow } from './components/run-row';

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
