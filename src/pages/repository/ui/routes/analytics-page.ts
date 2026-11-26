import { lazy } from 'react';

export const AnalyticsPage = lazy(() =>
  import('../../pages/analytics/ui/page').then((module) => ({
    default: module.AnalyticsPage,
  })),
);
