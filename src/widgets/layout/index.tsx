import { type ViewModelProps, withViewModel } from "mobx-view-model-react";
import { Suspense, type ReactNode } from "react";
import { GitLabConnectionProvider } from "@/shared/lib/gitlab/connection-context";
import { AppNav } from "./components/app-nav";
import { NavTreeSidebar } from "./components/nav-tree-sidebar";
import { LayoutVM } from "./model/layout-vm";

export interface LayoutProps extends ViewModelProps<LayoutVM> {
  children: ReactNode;
}

export const Layout = withViewModel(LayoutVM, ({ model, children }: LayoutProps) => {
  const { stores, navigation } = model.globals;
  const { navTree } = stores;

  return (
    <GitLabConnectionProvider connection={stores.settings.activeConnection}>
      <div className="flex min-h-screen min-w-0 flex-col bg-canvas-default">
        <NavTreeSidebar
          store={navTree}
          activeItemId={navigation.mergeRequests.activeItemId}
          onSelect={(item) => navigation.mergeRequests.select(item)}
          onClose={(item) => navigation.mergeRequests.close(item)}
          onSelectGroup={(group) => navigation.mergeRequests.selectGroup(group)}
        />
        <div className="flex min-w-0 flex-1 flex-col transition-[margin-left] duration-300 ease-in-out peer-data-[expanded]/workspace:ml-4 motion-reduce:transition-none md:peer-data-[expanded=true]/workspace:ml-64">
          <div className="@container">
            <AppNav />
          </div>
          <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
        </div>
      </div>
    </GitLabConnectionProvider>
  );
});
