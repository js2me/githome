import { QueryClient } from "mobx-tanstack-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

queryClient.mount();
