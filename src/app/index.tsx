import { ViewModelsProvider } from "mobx-view-model-react";
import type { Globals } from "@/globals";
import { Routing } from "./routing";

export function App({ globals }: { globals: Globals }) {
  return (
    <ViewModelsProvider value={globals.stores.viewModels}>
      <Routing globals={globals} />
    </ViewModelsProvider>
  );
}
