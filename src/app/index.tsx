import { ViewModelsProvider } from 'mobx-view-model-react';

import type { AppWorkspace } from './model/app-workspace';
import { Routing } from './routing';

export function App({ globals }: { globals: AppWorkspace }) {
  return (
    <ViewModelsProvider value={globals.stores.viewModels}>
      <Routing globals={globals} />
    </ViewModelsProvider>
  );
}
