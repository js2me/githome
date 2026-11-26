import { lazy } from 'react';

export const MergeRequestsPage = lazy(() =>
  import('../../pages/merge-requests/ui/page').then((module) => ({
    default: module.MergeRequestsPage,
  })),
);
