import { withPropsViewModel, withViewModel } from 'mobx-view-model-react';
import { StatusMessage } from '@/shared/ui/status-message';
import { AnalyticsPageVM } from '../model';
import { AnalyticsChartVM } from '../model/chart';

const AnalyticsChart = withPropsViewModel(AnalyticsChartVM, ({ model }) => (
  <div
    ref={model.container}
    className={
      model.payload.kind === 'activity'
        ? 'h-[320px] w-full sm:h-[360px]'
        : 'h-[300px] w-full sm:h-[360px]'
    }
  />
));

const METRIC_CARD_CLASS = 'glass-panel rounded-2xl p-4';

export const AnalyticsPage = withViewModel(AnalyticsPageVM, ({ model }) => {
  const { commits, mergedMergeRequests } = model.analytics;
  const hasConnection = Boolean(model.globals.stores.settings.activeConnection);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="m-0 font-semibold text-[22px]">Аналитика</h2>
          <p className="mt-1 mb-0 text-slate-500 text-sm">
            Коммиты основной ветки и смерженные merge requests
          </p>
        </div>

        <label className="flex flex-col gap-1 font-semibold text-slate-500 text-xs">
          Период
          <select
            className="glass-input rounded-lg px-3 py-2 text-sm"
            value={model.period}
            onChange={(event) => model.setPeriod(event.target.value)}
          >
            <option value={30}>Последние 30 дней</option>
            <option value={90}>Последние 90 дней</option>
            <option value={180}>Последние 180 дней</option>
          </select>
        </label>
      </div>

      {!hasConnection && (
        <StatusMessage>
          Подключите GitLab, чтобы загрузить аналитику.
        </StatusMessage>
      )}

      {model.isLoading && !model.hasAnalyticsData && (
        <StatusMessage>Загружаем аналитику репозитория...</StatusMessage>
      )}

      {model.isLoading && model.hasAnalyticsData && (
        <p className="mb-4 text-slate-500 text-sm" role="status">
          Загружаем оставшиеся данные аналитики...
        </p>
      )}

      {model.errorMessage && !model.isLoading && (
        <StatusMessage error>{model.errorMessage}</StatusMessage>
      )}

      {hasConnection && model.hasAnalyticsData && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className={METRIC_CARD_CLASS}>
              <p className="m-0 font-medium text-slate-500 text-sm">Коммиты</p>
              <p className="mt-2 mb-0 font-bold text-3xl text-slate-900 dark:text-slate-100">
                {commits.length.toLocaleString('ru-RU')}
              </p>
            </article>
            <article className={METRIC_CARD_CLASS}>
              <p className="m-0 font-medium text-slate-500 text-sm">
                Смерженные MR
              </p>
              <p className="mt-2 mb-0 font-bold text-3xl text-slate-900 dark:text-slate-100">
                {mergedMergeRequests.length.toLocaleString('ru-RU')}
              </p>
            </article>
            <article className={METRIC_CARD_CLASS}>
              <p className="m-0 font-medium text-slate-500 text-sm">
                MR с JIRA-ID
              </p>
              <p className="mt-2 mb-0 font-bold text-3xl text-slate-900 dark:text-slate-100">
                {model.mergeRequestsWithJiraId.length.toLocaleString('ru-RU')}
              </p>
            </article>
            <article className={METRIC_CARD_CLASS}>
              <p className="m-0 font-medium text-slate-500 text-sm">
                Изменённые файлы в MR
              </p>
              <p className="mt-2 mb-0 font-bold text-3xl text-slate-900 dark:text-slate-100">
                {model.totalChangedFiles.toLocaleString('ru-RU')}
              </p>
            </article>
          </div>

          <article className="glass-panel rounded-2xl p-4 sm:p-5">
            <div className="mb-2">
              <h3 className="m-0 font-semibold text-base text-slate-900 dark:text-slate-100">
                Активность по времени
              </h3>
              <p className="mt-1 mb-0 text-slate-500 text-sm">
                Количество событий за день или неделю
              </p>
            </div>
            <AnalyticsChart kind="activity" />
          </article>

          <article className="glass-panel mt-4 rounded-2xl p-4 sm:p-5">
            <div className="mb-2">
              <h3 className="m-0 font-semibold text-base text-slate-900 dark:text-slate-100">
                Изменённые файлы по авторам
              </h3>
              <p className="mt-1 mb-0 text-slate-500 text-sm">
                Сумма файловых изменений в смерженных MR за выбранный период;
                один файл может учитываться в нескольких MR.
              </p>
            </div>
            {model.authorChanges.length > 0 ? (
              <AnalyticsChart kind="authors" />
            ) : (
              <p className="mt-5 mb-0 text-slate-500 text-sm">
                Нет смерженных MR за выбранный период.
              </p>
            )}
          </article>
        </>
      )}
    </section>
  );
});
