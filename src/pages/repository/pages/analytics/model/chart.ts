import type { EChartsOption } from 'echarts';
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, reaction } from 'mobx';
import { createRef } from 'yummies/mobx';
import { VM } from '@/shared/lib/view-models/vm';
import type { AnalyticsPageVM } from './index';

const CHART_SERIES = [
  { key: 'commits', name: 'Коммиты', color: '#6366f1' },
  { key: 'mergeRequests', name: 'Смерженные MR', color: '#10b981' },
  { key: 'jiraMergeRequests', name: 'MR с JIRA-ID', color: '#f59e0b' },
] as const;

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export class AnalyticsChartVM extends VM<
  { kind: 'authors' | 'activity' },
  AnalyticsPageVM
> {
  readonly container = createRef<HTMLDivElement>();
  private disposeChart?: () => void;

  @computed
  get option(): EChartsOption {
    const isDark = this.globals.stores.theme.isDark;
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const splitLineColor = isDark ? '#334155' : '#e2e8f0';
    if (this.payload.kind === 'authors') {
      const authors = this.parentViewModel.authorChanges;
      return {
        grid: { top: 12, right: 24, bottom: 12, left: 8, containLabel: true },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderColor: splitLineColor,
          textStyle: { color: isDark ? '#e2e8f0' : '#0f172a' },
        },
        xAxis: {
          type: 'value',
          minInterval: 1,
          axisLabel: { color: textColor },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        },
        yAxis: {
          type: 'category',
          inverse: true,
          data: authors.map((item) => item.author),
          axisLabel: { color: textColor, width: 140, overflow: 'truncate' },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        series: [
          {
            name: 'Изменённые файлы',
            type: 'bar',
            data: authors.map((item) => item.changedFiles),
            barMaxWidth: 24,
            itemStyle: { color: '#6366f1', borderRadius: [0, 6, 6, 0] },
            label: {
              show: true,
              position: 'right',
              color: textColor,
            },
          },
        ],
      };
    }
    const buckets = this.parentViewModel.activityBuckets;
    return {
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
        trigger: 'axis',
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        borderColor: splitLineColor,
        textStyle: { color: isDark ? '#e2e8f0' : '#0f172a' },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: buckets.map((bucket) => bucket.label),
        axisLabel: { color: textColor, hideOverlap: true },
        axisLine: { lineStyle: { color: splitLineColor } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: textColor },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
      },
      series: CHART_SERIES.map((series) => ({
        name: series.name,
        type: 'line',
        smooth: 0.25,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.06 },
        emphasis: { focus: 'series' },
        data: buckets.map((bucket) => bucket[series.key]),
      })),
    };
  }

  willMount() {
    reaction(
      () => this.container.current,
      (container) => {
        this.disposeChart?.();
        if (!container) return;
        const chart = echarts.init(container);
        const stop = reaction(
          () => this.option,
          (option) => chart.setOption(option),
          { fireImmediately: true },
        );
        const observer = new ResizeObserver(() => chart.resize());
        observer.observe(container);
        this.disposeChart = () => {
          stop();
          observer.disconnect();
          chart.dispose();
          this.disposeChart = undefined;
        };
      },
      { fireImmediately: true, signal: this.unmountSignal },
    );
  }

  didUnmount() {
    this.disposeChart?.();
  }
}
