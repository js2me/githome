import { type ViewModelProps, withViewModel } from "mobx-view-model-react";
import { Suspense, type ReactNode } from "react";
import { AppNav } from "./components/app-nav";
import { LayoutVM } from "./model/layout-vm";

export interface LayoutProps extends ViewModelProps<LayoutVM> {
  children: ReactNode;
}

export const Layout = withViewModel(LayoutVM, ({ children }: LayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <AppNav />
      <main className="flex-1 p-6">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  );
});
