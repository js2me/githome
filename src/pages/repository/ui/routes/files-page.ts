import { lazy } from 'react';

export const FilesPage = lazy(() =>
  import('../../pages/files/ui/page').then((module) => ({
    default: module.FilesPage,
  })),
);
