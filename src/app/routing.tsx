import { observer } from 'mobx-react-lite';
import { RouteView, RouteViewGroup } from 'mobx-route/react';
import { Suspense } from 'react';
import type { Workspace } from '@/features/workspace-navigation';
import { Layout } from '@/widgets/layout';
import { GroupPage } from './routes/group-page';
import { HomePage } from './routes/home-page';
import { RepositoryPage } from './routes/repository-page';

export const Routing = observer(({ globals }: { globals: Workspace }) => {
  return (
    <RouteViewGroup layout={Layout}>
      <Suspense fallback={null}>
        <RouteView route={globals.routes.home} view={HomePage} />
        <RouteView route={globals.routes.group} view={GroupPage} />
        <RouteView route={globals.routes.repository} view={RepositoryPage} />
      </Suspense>
    </RouteViewGroup>
  );
});
