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
  const repository = createRoute("/repository/:projectId", { exact: false });
  const files = repository.extend("/files", { exact: true });
  const mergeRequests = repository.extend("/merge-requests", { exact: true });
  const mergeRequest = mergeRequests.extend("/:mergeRequestIid", { exact: true });

  return {
    home: createRoute("/", { exact: true }),
    repository,
    files,
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
}
