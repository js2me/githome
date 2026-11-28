import { type ViewModelProps, withViewModel } from 'mobx-view-model-react';
import { type ReactNode, Suspense } from 'react';
import { GitLabConnectionProvider } from '@/shared/lib/gitlab/connection/connection-context';
import { AppBreadcrumbs } from './components/navigation/app-breadcrumbs';
import { AppNav } from './components/navigation/app-nav';
import { RefreshNotice } from './components/refresh-notice';
import { LayoutVM } from './model/layout-vm';
import { ProjectSections } from './ui/project-sections';
import { WorkspaceTabs } from './ui/workspace-tabs';
import './ui/workbench.css';

export interface LayoutProps extends ViewModelProps<LayoutVM> {
  children: ReactNode;
}

export const Layout = withViewModel(
  LayoutVM,
  ({ model, children }: LayoutProps) => {
    const { stores } = model.globals;

    return (
      <GitLabConnectionProvider connection={stores.settings.activeConnection}>
        <div className="workbench">
          <AppNav />
          <WorkspaceTabs />
          <AppBreadcrumbs />
          <ProjectSections />
          <RefreshNotice model={model.refreshShortcut} />
          <main className="workbench-main">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
        </div>
      </GitLabConnectionProvider>
    );
  },
);

export type { LayoutVM } from './model/layout-vm';
export { openGitLabLink } from './model/links/open-gitlab-link';
