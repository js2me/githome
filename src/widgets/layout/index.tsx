import { observer } from "mobx-react-lite";
import { type ViewModelProps, withViewModel } from "mobx-view-model-react";
import { Suspense, type ReactNode } from "react";
import { GitLabConnectionProvider } from "@/shared/lib/gitlab/connection-context";
import { AppNav } from "./components/app-nav";
import { LayoutVM } from "./model/layout-vm";

export interface LayoutProps extends ViewModelProps<LayoutVM> {
  children: ReactNode;
}

const LayoutContent = observer(({ children, model }: LayoutProps) => {
  const connection = model.globals.stores.settings.activeConnection;

  return (
    <GitLabConnectionProvider connection={connection}>
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
        <AppNav />
        <main className="flex-1 p-6">
          <Suspense fallback={null}>{children}</Suspense>
        </main>
      </div>
    </GitLabConnectionProvider>
  );
});

export const Layout = withViewModel(LayoutVM, (props: LayoutProps) => (
  <LayoutContent {...props} />
));
