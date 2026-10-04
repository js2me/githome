import { type ViewModelProps, withViewModel } from "mobx-view-model-react";
import { Suspense, type ReactNode } from "react";
import { GitLabConnectionProvider } from "@/shared/lib/gitlab/connection-context";
import { AppNav } from "./components/app-nav";
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
        <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
          <Suspense fallback={null}>{children}</Suspense>
        </main>
      </div>
    </GitLabConnectionProvider>
  );
});
