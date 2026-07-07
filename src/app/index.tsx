import { ViewModelsProvider } from "mobx-view-model-react";
import { useMemo } from "react";
import { Globals } from "@/globals";
import { Routing } from "./routing";

export function App() {
  const globals = useMemo(() => new Globals(), []);

  console.info('[globals]', globals)

  return (
    <ViewModelsProvider value={globals.stores.viewModels}>
      <Routing globals={globals} />
    </ViewModelsProvider>
  );
}
