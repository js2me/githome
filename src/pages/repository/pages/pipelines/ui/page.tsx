import {
  ArrowsRotateRight,
  Magnifier,
  Play,
  Timeline,
  Xmark,
} from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { pipelineStatusLabel } from '@/entities/gitlab-pipelines';
import { t } from '@/shared/lib/i18n';
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
  const { selectedPipeline, linkedPipelineQuery } = model;
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
          {t('pipelines.pipelines')}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={control}
            type="button"
            aria-label={t('pipelines.refreshPipelines')}
            title={t('pipelines.refreshPipelines')}
            onClick={list.refresh}
          >
            <ArrowsRotateRight width={15} height={15} aria-hidden />
            <span className="hidden min-[480px]:inline">
              {t('pipelines.refresh')}
            </span>
          </button>
          {list.canManagePipelines && (
            <button
              className="glass-primary inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 font-semibold text-sm"
              type="button"
              aria-expanded={list.isCreateFormOpen}
              onClick={list.toggleCreateForm}
            >
              <Play width={14} height={14} aria-hidden />
              {t('pipelines.runPipeline')}
            </button>
          )}
        </div>
      </header>

      {list.isCreateFormOpen && (
        <form
          className="glass-panel mb-4 grid gap-3 rounded-2xl p-4"
          aria-label={t('pipelines.runAPipeline')}
          onSubmit={(event) => {
            event.preventDefault();
            void list.createPipeline();
          }}
        >
          <label className="grid gap-1.5 font-semibold text-sm">
            {t('pipelines.branchTagOrCommitSha')}
            <input
              className="glass-input min-w-0 rounded-lg px-3 py-2 font-normal"
              autoComplete="off"
              required
              value={list.pipelineRef}
              onChange={(event) => list.setPipelineRef(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 font-semibold text-sm">
            {t('pipelines.variables')}
            <span className="font-normal text-fg-muted text-xs">
              {t('pipelines.oneKeyValuePairPerLine')}
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
              {list.isCreatingPipeline
                ? t('pipelines.starting')
                : t('pipelines.run')}
            </button>
            <button
              className={control}
              type="button"
              disabled={list.isCreatingPipeline}
              onClick={list.toggleCreateForm}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      <div className="glass-panel pipeline-list overflow-hidden rounded-2xl">
        <div className="pipeline-toolbar">
          <label className="grid min-w-0 gap-1.5 font-semibold text-fg-muted text-xs">
            {t('pipelines.status')}
            <select
              className="glass-input h-9 min-w-0 rounded-lg px-2 font-normal text-fg-default text-sm"
              value={list.statusFilter}
              onChange={(event) => list.setStatusFilter(event.target.value)}
            >
              <option value="">{t('pipelines.allStatuses')}</option>
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
              {t('pipelines.branchOrTag')}
              <input
                className="glass-input h-9 min-w-0 rounded-lg px-3 font-normal text-fg-default text-sm"
                type="text"
                placeholder={t('pipelines.forExampleMain')}
                value={list.refSearch}
                onChange={(event) => list.setRefSearch(event.target.value)}
              />
            </label>
            <button
              className="glass-control grid size-9 shrink-0 place-items-center rounded-lg"
              type="submit"
              aria-label={t('pipelines.applyBranchFilter')}
              title={t('pipelines.applyBranchFilter')}
            >
              <Magnifier width={16} height={16} aria-hidden />
            </button>
            {list.refFilter && (
              <button
                className="glass-control grid size-9 shrink-0 place-items-center rounded-lg"
                type="button"
                aria-label={t('pipelines.resetBranchFilter')}
                title={t('pipelines.resetBranchFilter')}
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
            {t('pipelines.loadingPipelines')}
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
              ? t('pipelines.noPipelinesMatchTheseFilters')
              : t('pipelines.thisProjectHasNoPipelinesYet')}
          </p>
        )}
        {list.pipelines.length > 0 && (
          <>
            <div className="pipeline-columns" aria-hidden>
              <span>{t('pipelines.run2')}</span>
              <span>{t('pipelines.status')}</span>
              <span>{t('common.updated')}</span>
            </div>
            <ul
              className="m-0 list-none divide-y divide-[var(--glass-border)] p-0"
              aria-label={t('pipelines.pipelineRuns')}
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
              {list.isFetchingNextPage
                ? t('common.loading')
                : list.canLoadMoreLabel}
            </button>
          </div>
        )}
      </div>
      {!list.canManagePipelines && (
        <p className="mt-3 text-fg-muted text-xs">
          {t('pipelines.managingPipelinesRequiresTheDeveloperRoleOr')}
        </p>
      )}
      {list.actionError && !selectedPipeline && (
        <StatusMessage error>{list.actionError}</StatusMessage>
      )}
      {linkedPipelineQuery.isLoading && !selectedPipeline && (
        <StatusMessage>{t('common.loading')}</StatusMessage>
      )}
      {linkedPipelineQuery.error && !selectedPipeline && (
        <StatusMessage error>
          {t('pipelines.couldNotLoadThePipeline')}
        </StatusMessage>
      )}
      {selectedPipeline && (
        <RunDetails
          key={selectedPipeline.id}
          model={model}
          run={selectedPipeline}
        />
      )}
    </section>
  );
});
