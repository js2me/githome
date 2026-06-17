import type { Globals } from "@/globals";
import { buildGitlabRequestHeaders, resolveGitlabRequestUrl } from "@/shared/api/gitlab";
import {
  createFetchQuery,
  type CreateFetchQueryOptions,
  type FetchQueryParams,
  type MaybeFalsy,
  resolveFetchQueryParams,
} from "@/shared/lib/create-fetch-query";

type GitlabFetchQueryParams = MaybeFalsy<
  Pick<FetchQueryParams, "path" | "query" | "notFoundAsNull" | "responseType">
>;

export type CreateGitlabQueryOptions<TData> = {
  globals: Globals;
  abortSignal: AbortSignal;
  select?: CreateFetchQueryOptions<TData>["select"];
  params: () => GitlabFetchQueryParams;
};

export const createGitlabQuery = <TData = unknown>(
  options: CreateGitlabQueryOptions<TData>,
) => {
  const { globals, abortSignal, select } = options;

  return createFetchQuery({
    abortSignal,
    select,
    params: () => {
      const connection = globals.stores.settings.activeConnection;
      if (!connection) {
        return false;
      }

      const fetchParams = resolveFetchQueryParams(options.params());
      if (!fetchParams) {
        return false;
      }

      return {
        path: resolveGitlabRequestUrl(
          connection.gitlabUrl,
          `/api/v4${fetchParams.path}`,
        ),
        query: fetchParams.query,
        notFoundAsNull: fetchParams.notFoundAsNull,
        responseType: fetchParams.responseType,
        request: {
          headers: buildGitlabRequestHeaders(connection.gitlabUrl, {
            "PRIVATE-TOKEN": connection.gitToken,
          }),
        },
      };
    },
  });
};
