import { lazy } from 'react';

export const RepositoryPage = lazy(() =>
  import('@/pages/repository').then((module) => ({
    default: module.RepositoryPage,
  })),
);
