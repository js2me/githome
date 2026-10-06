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
  const connection = model.globals.stores.settings.activeConnection;

  return (
    <GitLabConnectionProvider connection={connection}>
      <div className="flex min-h-screen min-w-0 flex-col bg-canvas-default">
        <AppNav />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
          <NavTreeSidebar
            store={model.globals.stores.navTree}
            activeItemId={model.globals.navigation.mergeRequests.activeItemId}
            onSelect={(item) => model.globals.navigation.mergeRequests.select(item)}
            onClose={(item) => model.globals.navigation.mergeRequests.close(item)}
            onSelectGroup={(group) =>
              model.globals.navigation.mergeRequests.selectGroup(group)
            }
          />
          <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
        </div>
      </div>
    </GitLabConnectionProvider>
  );
});
