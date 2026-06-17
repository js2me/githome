import { observer } from "mobx-react-lite";
import { RouteView, RouteViewGroup } from "mobx-route/react";
import { lazy } from "react";
import type { Globals } from "@/globals";
import { Layout } from "@/widgets/layout";

const HomePage = lazy(() =>
  import("@/pages/home/ui/page").then((module) => ({
    default: module.HomePage,
  })),
);

const RepositoryShell = lazy(() =>
  import("@/pages/repository/ui/repository-shell").then((module) => ({
    default: module.RepositoryShell,
  })),
);

const RepositoryPage = lazy(() =>
  import("@/pages/repository/ui/page").then((module) => ({
    default: module.RepositoryPage,
  })),
);

const MergeRequestsPage = lazy(() =>
  import("@/pages/repository/pages/merge-requests/ui/page").then((module) => ({
    default: module.MergeRequestsPage,
  })),
);

const MergeRequestPage = lazy(() =>
  import("@/pages/repository/pages/merge-requests/pages/[id]/ui/page").then(
    (module) => ({
      default: module.MergeRequestPage,
    }),
  ),
);

export const Routing = observer(({ globals }: { globals: Globals }) => {
  const { home, repositoryRoot, repository, mergeRequests, mergeRequest } =
    globals.router.routes;

  return (
    <RouteViewGroup layout={Layout}>
      <RouteView route={home} view={HomePage} />

      <RouteView route={repositoryRoot} view={RepositoryShell}>
        <RouteView route={repository} view={RepositoryPage} />
        <RouteView route={mergeRequests} view={MergeRequestsPage} />
        <RouteView route={mergeRequest} view={MergeRequestPage} />
      </RouteView>
    </RouteViewGroup>
  );
});
