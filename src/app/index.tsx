import { ViewModelsProvider } from "mobx-view-model-react";
import { globals } from "@/globals";
import { Routing } from "./routing";


export function App() {
  return (
    <ViewModelsProvider value={globals.stores.viewModels}>
      <Routing globals={globals} />
    </ViewModelsProvider>
  );
}
