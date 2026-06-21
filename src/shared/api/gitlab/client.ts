import type { GitLabConnection } from "@/shared/lib/gitlab/connection";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export const GIT_PROXY_PREFIX = "/git-proxy";

export const normalizeGitlabBaseUrl = (url: string): string => {
  let normalized = url.trim();
  if (!normalized) {
    return "";
  }

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  return normalized.replace(/\/+$/, "");
};

const getGitlabOrigin = (gitlabUrl: string) => {
  const url = new URL(normalizeGitlabBaseUrl(gitlabUrl));
  return {
    protocol: url.protocol.replace(":", ""),
    host: url.host,
  };
};

export const resolveGitlabRequestUrl = (
  gitlabUrl: string,
  path: string,
): string => {
  const baseUrl = normalizeGitlabBaseUrl(gitlabUrl);
  const useProxy = import.meta.env.DEV || import.meta.env.VITE_ELECTRON;

  if (!useProxy) {
    return `${baseUrl}${path}`;
  }

  const { host } = getGitlabOrigin(gitlabUrl);
  return `${GIT_PROXY_PREFIX}/${host}${path}`;
};

export const buildGitlabRequestHeaders = (
  gitlabUrl: string,
  headers: Record<string, string>,
): Record<string, string> => {
  const useProxy = import.meta.env.DEV || import.meta.env.VITE_ELECTRON;

  if (!useProxy) {
    return headers;
  }

  const { protocol } = getGitlabOrigin(gitlabUrl);

  return {
    ...headers,
    "X-Gitlab-Proxy-Protocol": protocol,
  };
};

export const gitlabGraphql = async <T>(
  connection: GitLabConnection,
  query: string,
  variables?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> => {
  const response = await fetch(
    resolveGitlabRequestUrl(connection.gitlabUrl, "/api/graphql"),
    {
      method: "POST",
      headers: buildGitlabRequestHeaders(connection.gitlabUrl, {
        "PRIVATE-TOKEN": connection.gitToken,
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ query, variables }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`GitLab GraphQL error: ${response.status}`);
  }

  const payload = (await response.json()) as GraphQLResponse<T>;

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  if (!payload.data) {
    throw new Error("GitLab GraphQL error: empty response");
  }

  return payload.data;
};

export const buildGitlabPath = (
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
) => {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value != null) {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export const gitlabFetch = async (
  connection: GitLabConnection,
  path: string,
  signal?: AbortSignal,
) => {
  const response = await fetch(
    resolveGitlabRequestUrl(connection.gitlabUrl, `/api/v4${path}`),
    {
      headers: buildGitlabRequestHeaders(connection.gitlabUrl, {
        "PRIVATE-TOKEN": connection.gitToken,
      }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.status}`);
  }

  return response;
};

export const gitlabPost = async <T>(
  connection: GitLabConnection,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> => {
  const response = await fetch(
    resolveGitlabRequestUrl(connection.gitlabUrl, `/api/v4${path}`),
    {
      method: "POST",
      headers: buildGitlabRequestHeaders(connection.gitlabUrl, {
        "PRIVATE-TOKEN": connection.gitToken,
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(body),
      signal,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      errorBody
        ? `GitLab API error: ${response.status} — ${errorBody}`
        : `GitLab API error: ${response.status}`,
    );
  }

  return (await response.json()) as T;
};

export const gitlabPut = async <T>(
  connection: GitLabConnection,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> => {
  const response = await fetch(
    resolveGitlabRequestUrl(connection.gitlabUrl, `/api/v4${path}`),
    {
      method: "PUT",
      headers: buildGitlabRequestHeaders(connection.gitlabUrl, {
        "PRIVATE-TOKEN": connection.gitToken,
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(body),
      signal,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      errorBody
        ? `GitLab API error: ${response.status} — ${errorBody}`
        : `GitLab API error: ${response.status}`,
    );
  }

  return (await response.json()) as T;
};

export const fetchGitlabJson = async <T>(
  connection: GitLabConnection,
  path: string,
  options?: {
    query?: Record<string, string | number | boolean | null | undefined>;
    signal?: AbortSignal;
  },
): Promise<T> => {
  const response = await gitlabFetch(
    connection,
    buildGitlabPath(path, options?.query),
    options?.signal,
  );

  return (await response.json()) as T;
};

export const buildMergeRequestWebPath = (
  projectPath: string,
  mergeRequestIid: number,
  resource: string,
) => `/${projectPath}/-/merge_requests/${mergeRequestIid}/${resource}`;

export const fetchGitlabWebJson = async <T>(
  connection: GitLabConnection,
  path: string,
  options?: {
    query?: Record<string, string | number | boolean | null | undefined>;
    signal?: AbortSignal;
  },
): Promise<T> => {
  const response = await fetch(
    resolveGitlabRequestUrl(
      connection.gitlabUrl,
      buildGitlabPath(path, {
        ...options?.query,
        private_token: connection.gitToken,
      }),
    ),
    {
      headers: buildGitlabRequestHeaders(connection.gitlabUrl, {
        "PRIVATE-TOKEN": connection.gitToken,
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      }),
      redirect: "manual",
      signal: options?.signal,
    },
  );

  if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
    throw new Error(
      "GitLab web API: требуется авторизация (редирект на страницу входа). Проверьте токен доступа.",
    );
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      errorBody
        ? `GitLab web API error: ${response.status} — ${errorBody.slice(0, 200)}`
        : `GitLab web API error: ${response.status}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const body = await response.text();
    throw new Error(
      `GitLab web API returned non-JSON response: ${body.slice(0, 200)}`,
    );
  }

  return (await response.json()) as T;
};
