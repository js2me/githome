import { configure } from "mobx";
import { enableStaticRendering } from "mobx-react-lite";
import { queryClient } from "mobx-tanstack-query/preset";

queryClient.setDefaultOptions({
  queries: {
    refetchOnWindowFocus: false,
  }
});

configure({ enforceActions: "never" });

enableStaticRendering(typeof window === "undefined");

