import { withViewModel } from 'mobx-view-model-react';
import { getLocale, t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import { AnalyticsPageVM } from '../model';
import { AnalyticsChart } from './analytics-chart';

const METRIC_CARD_CLASS = 'glass-panel rounded-2xl p-4';

export const AnalyticsPage = withViewModel(AnalyticsPageVM, ({ model }) => {
  const { commits, mergedMergeRequests } = model.analytics;
  const hasConnection = Boolean(model.globals.stores.settings.activeConnection);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="m-0 font-semibold text-[22px]">
            {t('analytics.analytics')}
          </h2>
          <p className="mt-1 mb-0 text-slate-500 text-sm">
            {t('analytics.commitsOnTheDefaultBranchAndMerged')}
          </p>
        </div>

        <label className="flex flex-col gap-1 font-semibold text-slate-500 text-xs">
          {t('analytics.period')}
          <select
            className="glass-input rounded-lg px-3 py-2 text-sm"
            value={model.period}
            onChange={(event) => model.setPeriod(event.target.value)}
          >
            <option value={30}>{t('analytics.last30Days')}</option>
            <option value={90}>{t('analytics.last90Days')}</option>
            <option value={180}>{t('analytics.last180Days')}</option>
          </select>
        </label>
      </div>

      {!hasConnection && (
        <StatusMessage>
          {t('analytics.connectToGitlabToLoadAnalytics')}
        </StatusMessage>
      )}

      {model.isLoading && !model.hasAnalyticsData && (
        <StatusMessage>
          {t('analytics.loadingRepositoryAnalytics')}
        </StatusMessage>
      )}

      {model.isLoading && model.hasAnalyticsData && (
        <p className="mb-4 text-slate-500 text-sm" role="status">
          {t('analytics.loadingRemainingAnalyticsData')}
        </p>
      )}

      {model.errorMessage && !model.isLoading && (
        <StatusMessage error>{model.errorMessage}</StatusMessage>
      )}

      {hasConnection && model.hasAnalyticsData && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className={METRIC_CARD_CLASS}>
              <p className="m-0 font-medium text-slate-500 text-sm">
                {t('analytics.commits')}
              </p>
              <p className="mt-2 mb-0 font-bold text-3xl text-slate-900 dark:text-slate-100">
                {commits.length.toLocaleString(getLocale())}
              </p>
            </article>
            <article className={METRIC_CARD_CLASS}>
              <p className="m-0 font-medium text-slate-500 text-sm">
                {t('analytics.mergedRequests')}
              </p>
              <p className="mt-2 mb-0 font-bold text-3xl text-slate-900 dark:text-slate-100">
                {mergedMergeRequests.length.toLocaleString(getLocale())}
              </p>
            </article>
            <article className={METRIC_CARD_CLASS}>
              <p className="m-0 font-medium text-slate-500 text-sm">
                {t('analytics.requestsWithAJiraIssueId')}
              </p>
              <p className="mt-2 mb-0 font-bold text-3xl text-slate-900 dark:text-slate-100">
                {model.mergeRequestsWithJiraId.length.toLocaleString(
                  getLocale(),
                )}
              </p>
            </article>
            <article className={METRIC_CARD_CLASS}>
              <p className="m-0 font-medium text-slate-500 text-sm">
                {t('analytics.filesChangedInMergeRequests')}
              </p>
              <p className="mt-2 mb-0 font-bold text-3xl text-slate-900 dark:text-slate-100">
                {model.totalChangedFiles.toLocaleString(getLocale())}
              </p>
            </article>
          </div>

          <article className="glass-panel rounded-2xl p-4 sm:p-5">
            <div className="mb-2">
              <h3 className="m-0 font-semibold text-base text-slate-900 dark:text-slate-100">
                {t('analytics.activityOverTime')}
              </h3>
              <p className="mt-1 mb-0 text-slate-500 text-sm">
                {t('analytics.numberOfEventsPerDayOrWeek')}
              </p>
            </div>
            <AnalyticsChart kind="activity" />
          </article>

          <article className="glass-panel mt-4 rounded-2xl p-4 sm:p-5">
            <div className="mb-2">
              <h3 className="m-0 font-semibold text-base text-slate-900 dark:text-slate-100">
                {t('analytics.changedFilesByAuthor')}
              </h3>
              <p className="mt-1 mb-0 text-slate-500 text-sm">
                {t('analytics.fileChangesInRequestsMergedDuringThis')}
              </p>
            </div>
            {model.authorChanges.length > 0 ? (
              <AnalyticsChart kind="authors" />
            ) : (
              <p className="mt-5 mb-0 text-slate-500 text-sm">
                {t('analytics.noMergedRequestsInThisPeriod')}
              </p>
            )}
          </article>
        </>
      )}
    </section>
  );
});
