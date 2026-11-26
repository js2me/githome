import { lazy } from 'react';

export const GroupPage = lazy(() =>
  import('@/pages/group').then(({ GroupPage }) => ({ default: GroupPage })),
);
