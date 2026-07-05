import { configure } from "mobx";
import { enableStaticRendering } from "mobx-react-lite";
import { queryClient } from "mobx-tanstack-query/preset";
import { initGlobals } from "@/globals";

queryClient.setDefaultOptions({
  queries: {
    refetchOnWindowFocus: false,
  }
});

configure({ enforceActions: "never" });

enableStaticRendering(typeof window === "undefined");

initGlobals();