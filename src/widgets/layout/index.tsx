import { type ViewModelProps, withViewModel } from "mobx-view-model-react";
import type { ReactNode } from "react";
import { Header } from "./components/header";
import { LayoutVM } from "./model/layout-vm";

export interface LayoutProps extends ViewModelProps<LayoutVM> {
  children: ReactNode;
}

export const Layout = withViewModel(LayoutVM, ({ children }: LayoutProps) => {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">{children}</main>
    </div>
  );
});
