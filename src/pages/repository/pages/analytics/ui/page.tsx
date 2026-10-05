import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { withViewModel } from "mobx-view-model-react";
import { StatusMessage } from "@/shared/ui/status-message";
import { AnalyticsPageVM } from "../model";

const CHART_SERIES = [
  { key: "commits", name: "Коммиты", color: "#6366f1" },
  { key: "mergeRequests", name: "Смерженные MR", color: "#10b981" },
  { key: "jiraMergeRequests", name: "MR с JIRA-ID", color: "#f59e0b" },
] as const;

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const AnalyticsChart = ({
  buckets,
  isDark,
}: {
  buckets: AnalyticsPageVM["activityBuckets"];
  isDark: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const chart = echarts.init(container);
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const splitLineColor = isDark ? "#334155" : "#e2e8f0";
    const option: EChartsOption = {
      animationDuration: 350,
      color: CHART_SERIES.map((series) => series.color),
      grid: { top: 24, right: 20, bottom: 12, left: 8, containLabel: true },
      legend: {
        bottom: 0,
        textStyle: { color: textColor },
        itemWidth: 10,
        itemHeight: 10,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        borderColor: splitLineColor,
        textStyle: { color: isDark ? "#e2e8f0" : "#0f172a" },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: buckets.map((bucket) => bucket.label),
        axisLabel: { color: textColor, hideOverlap: true },
        axisLine: { lineStyle: { color: splitLineColor } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: textColor },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: splitLineColor, type: "dashed" } },
      },
      series: CHART_SERIES.map((series) => ({
        name: series.name,
        type: "line",
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.06 },
        emphasis: { focus: "series" },
        data: buckets.map((bucket) => bucket[series.key]),
      })),
    };

    chart.setOption(option);
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [buckets, isDark]);

  return <div ref={containerRef} className="h-[320px] w-full sm:h-[360px]" />;
};

const AuthorChangesChart = ({
  authors,
  isDark,
}: {
  authors: AnalyticsPageVM["authorChanges"];
  isDark: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const chart = echarts.init(container);
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const splitLineColor = isDark ? "#334155" : "#e2e8f0";
    const option: EChartsOption = {
      grid: { top: 12, right: 24, bottom: 12, left: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        borderColor: splitLineColor,
        textStyle: { color: isDark ? "#e2e8f0" : "#0f172a" },
      },
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: textColor },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: splitLineColor, type: "dashed" } },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: authors.map((item) => item.author),
        axisLabel: { color: textColor, width: 140, overflow: "truncate" },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: "Изменённые файлы",
          type: "bar",
          data: authors.map((item) => item.changedFiles),
          barMaxWidth: 24,
          itemStyle: { color: "#6366f1", borderRadius: [0, 6, 6, 0] },
          label: {
            show: true,
            position: "right",
            color: textColor,
          },
        },
      ],
    };

    chart.setOption(option);
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [authors, isDark]);

  return <div ref={containerRef} className="h-[300px] w-full sm:h-[360px]" />;
};

const METRIC_CARD_CLASS =
  "rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-gray-900";

export const AnalyticsPage = withViewModel(AnalyticsPageVM, ({ model }) => {
  const { commits, mergedMergeRequests } = model.analytics;
  const hasConnection = Boolean(model.globals.stores.settings.activeConnection);
  const isDark = model.globals.stores.theme.isDark;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="m-0 text-[22px] font-semibold">Аналитика</h2>
          <p className="mb-0 mt-1 text-sm text-slate-500">
            Коммиты основной ветки и смерженные merge requests
          </p>
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
          Период
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-gray-900 dark:text-slate-200"
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
        <StatusMessage>Подключите GitLab, чтобы загрузить аналитику.</StatusMessage>
      )}

      {model.isLoading && !model.hasAnalyticsData && (
        <StatusMessage>Загружаем аналитику репозитория...</StatusMessage>
      )}

      {model.isLoading && model.hasAnalyticsData && (
        <p className="mb-4 text-sm text-slate-500" role="status">
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
              <p className="m-0 text-sm font-medium text-slate-500">Коммиты</p>
              <p className="mb-0 mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {commits.length.toLocaleString("ru-RU")}
              </p>
            </article>
            <article className={METRIC_CARD_CLASS}>
              <p className="m-0 text-sm font-medium text-slate-500">
                Смерженные MR
              </p>
              <p className="mb-0 mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {mergedMergeRequests.length.toLocaleString("ru-RU")}
              </p>
            </article>
            <article className={METRIC_CARD_CLASS}>
              <p className="m-0 text-sm font-medium text-slate-500">MR с JIRA-ID</p>
              <p className="mb-0 mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {model.mergeRequestsWithJiraId.length.toLocaleString("ru-RU")}
              </p>
            </article>
            <article className={METRIC_CARD_CLASS}>
              <p className="m-0 text-sm font-medium text-slate-500">
                Изменённые файлы в MR
              </p>
              <p className="mb-0 mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {model.totalChangedFiles.toLocaleString("ru-RU")}
              </p>
            </article>
          </div>

          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-gray-900 sm:p-5">
            <div className="mb-2">
              <h3 className="m-0 text-base font-semibold text-slate-900 dark:text-slate-100">
                Активность по времени
              </h3>
              <p className="mb-0 mt-1 text-sm text-slate-500">
                Количество событий за день или неделю
              </p>
            </div>
            <AnalyticsChart
              buckets={model.activityBuckets}
              isDark={isDark}
            />
          </article>

          <article className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-gray-900 sm:p-5">
            <div className="mb-2">
              <h3 className="m-0 text-base font-semibold text-slate-900 dark:text-slate-100">
                Изменённые файлы по авторам
              </h3>
              <p className="mb-0 mt-1 text-sm text-slate-500">
                Сумма файловых изменений в смерженных MR за выбранный период; один файл может учитываться в нескольких MR.
              </p>
            </div>
            {model.authorChanges.length > 0 ? (
              <AuthorChangesChart authors={model.authorChanges} isDark={isDark} />
            ) : (
              <p className="mb-0 mt-5 text-sm text-slate-500">
                Нет смерженных MR за выбранный период.
              </p>
            )}
          </article>
        </>
      )}
    </section>
  );
});
