import { observer } from 'mobx-react-lite';
import { RouteView, RouteViewGroup } from 'mobx-route/react';
import { lazy, Suspense } from 'react';
import type { Workspace } from '@/features/workspace-navigation';
import { Layout } from '@/widgets/layout';

const HomePage = lazy(() =>
  import('@/pages/home').then((module) => ({
    default: module.HomePage,
  })),
);

const RepositoryPage = lazy(() =>
  import('@/pages/repository').then((module) => ({
    default: module.RepositoryPage,
  })),
);

export const Routing = observer(({ globals }: { globals: Workspace }) => {
  return (
    <RouteViewGroup layout={Layout}>
      <Suspense fallback={null}>
        <RouteView route={globals.routes.home} view={HomePage} />
        <RouteView route={globals.routes.repository} view={RepositoryPage} />
      </Suspense>
    </RouteViewGroup>
  );
});
