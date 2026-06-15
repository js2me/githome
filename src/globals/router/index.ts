import {
  createBrowserHistory,
  createQueryParams,
} from "mobx-location-history";
import {
  createRoute,
  createVirtualRoute,
  Router as RouterLib,
  routeConfig,
} from "mobx-route";

export interface RouterParams {
  history?: Parameters<typeof createBrowserHistory>[0];
}

const defineRoutes = () => {
  const repositoryRoot = createRoute("/repository/:projectId");
  const repository = repositoryRoot.extend("/", { index: true });
  const mergeRequests = repositoryRoot.extend("/merge-requests", {
    exact: true,
  });
  const mergeRequest = mergeRequests.extend("/:mergeRequestIid");

  return {
    home: createRoute("/", { exact: true }),
    repositoryRoot,
    repository,
    mergeRequests,
    mergeRequest,
    notFound: createVirtualRoute(),
  };
};

type RoutesMap = ReturnType<typeof defineRoutes>;

export class Router extends RouterLib<RoutesMap> {
  history;
  query;

  constructor(params?: RouterParams) {
    const history = createBrowserHistory(params?.history);
    const query = createQueryParams({ history });

    routeConfig.set({
      history,
      queryParams: query,
    });

    super({
      routes: defineRoutes(),
      history,
      queryParams: query,
    });

    this.history = history;
    this.query = query;
  }

  get isRepositorySectionOpen() {
    return (
      this.routes.repositoryRoot.isOpened ||
      this.routes.repositoryRoot.hasOpenedChildren
    );
  }
}
