import { QueryObserver } from "@tanstack/query-core";
import { queryClient } from "mobx-tanstack-query/preset";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { GitLabConnection } from "./connection";
import { connectionProfileOptions } from "./connection-profile-query";

export const useConnectionProfile = (connection: GitLabConnection | null) => {
  const observer = useMemo(
    () => new QueryObserver(queryClient, connectionProfileOptions(connection)),
    [connection?.id, connection?.credentialsRevision, connection?.gitlabUrl, connection?.gitToken],
  );
  const subscribe = useCallback((onChange: () => void) => {
    const unsubscribe = observer.subscribe(onChange);
    observer.updateResult();
    return unsubscribe;
  }, [observer]);
  const result = useSyncExternalStore(subscribe, () => observer.getCurrentResult());
  return result.isError ? undefined : result.data;
};
