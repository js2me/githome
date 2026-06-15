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

const defineRoutes = () => ({
  home: createRoute("/", { exact: true }),
  notFound: createVirtualRoute(),
});

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
