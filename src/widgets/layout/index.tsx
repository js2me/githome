import { type ViewModelProps, withViewModel } from 'mobx-view-model-react';
import { type ReactNode, Suspense } from 'react';
import { GitLabConnectionProvider } from '@/shared/lib/gitlab/connection-context';
import { AppNav } from './components/app-nav';
import { WorkspacePicker } from './components/workspace-picker';
import { LayoutVM } from './model/layout-vm';

export interface LayoutProps extends ViewModelProps<LayoutVM> {
  children: ReactNode;
}

export const Layout = withViewModel(
  LayoutVM,
  ({ model, children }: LayoutProps) => {
    const { stores } = model.globals;

    return (
      <GitLabConnectionProvider connection={stores.settings.activeConnection}>
        <div className="glass-canvas flex min-h-screen min-w-0 flex-col">
          <AppNav />
          <WorkspacePicker />
          <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
        </div>
      </GitLabConnectionProvider>
    );
  },
);

export type { LayoutVM } from './model/layout-vm';
