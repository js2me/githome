import { withPropsViewModel } from 'mobx-view-model-react';
import { AnalyticsChartVM } from '../model/chart';

export const AnalyticsChart = withPropsViewModel(
  AnalyticsChartVM,
  ({ model }) => (
    <div
      ref={model.container}
      className={
        model.payload.kind === 'activity'
          ? 'h-[320px] w-full sm:h-[360px]'
          : 'h-[300px] w-full sm:h-[360px]'
      }
    />
  ),
);
