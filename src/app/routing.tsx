import { observer } from "mobx-react-lite";
import { RouteView, RouteViewGroup } from "mobx-route/react";
import { lazy, Suspense } from "react";
import type { Globals } from "@/globals";
import { Layout } from "@/widgets/layout";

const HomePage = lazy(() =>
  import("@/pages/home/ui/page").then((module) => ({
    default: module.HomePage,
  })),
);

export const Routing = observer(({ globals }: { globals: Globals }) => {
  return (
    <Suspense fallback={null}>
      <RouteViewGroup layout={Layout}>
        <RouteView route={globals.router.routes.home} view={HomePage} />
      </RouteViewGroup>
    </Suspense>
  );
});
