import { ViewModelsProvider } from "mobx-view-model-react";
import { Globals } from "@/globals";
import { Routing } from "./routing";


export function App() {
  const globals = new Globals();

  return (
    <ViewModelsProvider value={globals.stores.viewModels}>
      <Routing globals={globals} />
    </ViewModelsProvider>
  );
}
