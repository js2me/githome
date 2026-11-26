import { lazy } from 'react';

export const MergeRequestPage = lazy(() =>
  import('../../pages/merge-requests/pages/[id]/ui/page').then((module) => ({
    default: module.MergeRequestPage,
  })),
);
