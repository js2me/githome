import { lazy } from 'react';

export const PipelinesPage = lazy(() =>
  import('../../pages/pipelines/ui/page').then((module) => ({
    default: module.PipelinesPage,
  })),
);
