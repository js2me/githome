export interface GitLabProject {
  id: number;
  name: string;
  pathWithNamespace: string;
  webUrl: string;
  avatarUrl: string | null;
  lastActivityAt: string | null;
}

export interface GitLabConnection {
  id: string;
  gitlabUrl: string;
  gitToken: string;
}

interface GraphQLFrecentResponse {
  data?: {
    frecentProjects?: Array<{
      id: string;
      name: string;
      fullPath: string;
      webUrl: string;
      avatarUrl?: string | null;
      lastActivityAt?: string | null;
    }> | null;
  };
  errors?: Array<{ message: string }>;
}

interface RestGitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  avatar_url?: string | null;
  last_activity_at?: string | null;
}

const parseProjectId = (globalId: string): number => {
  const match = globalId.match(/(\d+)$/);
  if (!match) {
    throw new Error(`Unexpected GitLab project id: ${globalId}`);
  }

  return Number(match[1]);
};

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

const mapGraphqlProject = (project: {
  id: string;
  name: string;
  fullPath: string;
  webUrl: string;
  avatarUrl?: string | null;
  lastActivityAt?: string | null;
}): GitLabProject => ({
  id: parseProjectId(project.id),
  name: project.name,
  pathWithNamespace: project.fullPath,
  webUrl: project.webUrl,
  avatarUrl: project.avatarUrl ?? null,
  lastActivityAt: project.lastActivityAt ?? null,
});

const mapRestProject = (project: RestGitLabProject): GitLabProject => ({
  id: project.id,
  name: project.name,
  pathWithNamespace: project.path_with_namespace,
  webUrl: project.web_url,
  avatarUrl: project.avatar_url ?? null,
  lastActivityAt: project.last_activity_at ?? null,
});

const mergeProjects = (
  primary: GitLabProject[],
  secondary: GitLabProject[],
  limit: number,
): GitLabProject[] => {
  const seen = new Set<number>();
  const result: GitLabProject[] = [];

  for (const project of [...primary, ...secondary]) {
    if (seen.has(project.id)) {
      continue;
    }

    seen.add(project.id);
    result.push(project);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
};

const fetchFrecentProjects = async (
  connection: GitLabConnection,
  signal?: AbortSignal,
): Promise<GitLabProject[]> => {
  const baseUrl = normalizeGitlabBaseUrl(connection.gitlabUrl);
  const response = await fetch(`${baseUrl}/api/graphql`, {
    method: "POST",
    headers: {
      "PRIVATE-TOKEN": connection.gitToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query FrecentProjects {
          frecentProjects {
            id
            name
            fullPath
            webUrl
            avatarUrl
            lastActivityAt
          }
        }
      `,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`GitLab GraphQL error: ${response.status}`);
  }

  const payload = (await response.json()) as GraphQLFrecentResponse;

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return (payload.data?.frecentProjects ?? []).map(mapGraphqlProject);
};

const fetchRecentProjects = async (
  connection: GitLabConnection,
  limit: number,
  signal?: AbortSignal,
): Promise<GitLabProject[]> => {
  const baseUrl = normalizeGitlabBaseUrl(connection.gitlabUrl);
  const params = new URLSearchParams({
    membership: "true",
    order_by: "last_activity_at",
    sort: "desc",
    per_page: String(limit),
    simple: "false",
  });

  const response = await fetch(
    `${baseUrl}/api/v4/projects?${params.toString()}`,
    {
      headers: {
        "PRIVATE-TOKEN": connection.gitToken,
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.status}`);
  }

  const projects = (await response.json()) as RestGitLabProject[];
  return projects.map(mapRestProject);
};

export const gitlabApi = {
  async getFrequentProjects(
    connection: GitLabConnection,
    options?: { limit?: number; signal?: AbortSignal },
  ): Promise<GitLabProject[]> {
    const limit = options?.limit ?? 10;
    const signal = options?.signal;

    try {
      const frecent = await fetchFrecentProjects(connection, signal);
      if (frecent.length >= limit) {
        return frecent.slice(0, limit);
      }

      const recent = await fetchRecentProjects(connection, limit, signal);
      return mergeProjects(frecent, recent, limit);
    } catch {
      return fetchRecentProjects(connection, limit, signal);
    }
  },
};
