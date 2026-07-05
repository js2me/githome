import { observer } from "mobx-react-lite";
import type { ReactNode } from "react";
import { withViewModel } from "mobx-view-model-react";
import { RepositoryPageVM } from "@/pages/repository/model";

const RepositoryShellLayout = observer(({ children }: { children?: ReactNode }) => {
  return <div className="min-w-0">{children}</div>;
});

export const RepositoryShell = withViewModel(
  RepositoryPageVM,
  RepositoryShellLayout,
);
