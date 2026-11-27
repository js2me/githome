import { ArrowDownToLine, ArrowsRotateRight } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { JobLogVM } from '../model/job-log';

const control =
  'glass-control inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 font-semibold text-xs disabled:opacity-50';

export const JobLog = withPropsViewModel(JobLogVM, ({ model }) => {
  const { text, visibleText, isAutoRefreshing, errorMessage, trace } = model;
  const { name } = model.payload;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {isAutoRefreshing && (
          <span className="mr-auto text-fg-muted text-xs">
            {t('pipelines.jobLogAutoRefresh')}
          </span>
        )}
        <button
          className={control}
          type="button"
          aria-label={t('pipelines.refreshJobLog')}
          aria-disabled={trace.isFetching}
          onClick={model.refresh}
        >
          <ArrowsRotateRight className="size-3.5" aria-hidden />
          {t('pipelines.refresh')}
        </button>
        {text && (
          <button className={control} type="button" onClick={model.download}>
            <ArrowDownToLine className="size-3.5" aria-hidden />
            {t('pipelines.downloadJobLog')}
          </button>
        )}
      </div>
      {text && (
        <input
          type="search"
          className="glass-input h-8 w-full rounded-md px-2 text-xs sm:max-w-sm"
          aria-label={t('pipelines.filterLogLines')}
          placeholder={t('pipelines.filterLogLines')}
          value={model.filter}
          onChange={(event) => model.setFilter(event.currentTarget.value)}
        />
      )}
      {errorMessage && (
        <p
          role={text || !isAutoRefreshing ? 'alert' : 'status'}
          className="text-[var(--color-danger-fg)] text-xs"
        >
          {errorMessage}
        </p>
      )}
      {visibleText ? (
        <pre
          ref={model.attachOutput}
          tabIndex={0}
          aria-label={t('pipelines.logForJob', { v1: name })}
          dir="ltr"
          className="m-0 max-h-[min(24rem,45dvh)] overflow-auto overscroll-contain whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-mono text-slate-100 text-xs leading-relaxed [overflow-wrap:anywhere]"
          onScroll={({ currentTarget }) => model.trackScroll(currentTarget)}
        >
          {visibleText}
        </pre>
      ) : text ? (
        <p role="status" className="text-fg-muted text-xs">
          {t('pipelines.noMatchingLogLines')}
        </p>
      ) : !errorMessage ? (
        <p role="status" className="text-fg-muted text-xs">
          {trace.isLoading
            ? t('pipelines.loadingLog')
            : t('pipelines.theLogIsEmpty')}
        </p>
      ) : null}
    </div>
  );
});
