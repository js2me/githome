import { type ViewModelProps, withViewModel } from "mobx-view-model-react";
import { Suspense, type ReactNode } from "react";
import { Header } from "./components/header";
import { RepoHeader } from "./components/repo-header";
import { LayoutVM } from "./model/layout-vm";

export interface LayoutProps extends ViewModelProps<LayoutVM> {
  children: ReactNode;
}

export const Layout = withViewModel(LayoutVM, ({ children, model }: LayoutProps) => {
  const showRepoHeader = model.globals.router.isRepositorySectionOpen;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <Header />
      {showRepoHeader && <RepoHeader />}
      <main className="flex-1 p-6">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  );
});
