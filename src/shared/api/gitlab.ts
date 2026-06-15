import { buildGitLabLineRangePayload } from "@/shared/lib/gitlab-line-code";

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  webUrl: string;
  state: string;
  draft: boolean;
  sourceBranch: string;
  targetBranch: string;
  updatedAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
}

export interface GitLabMergeRequestDetail extends GitLabMergeRequest {
  description: string;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  labels: string[];
  mergeStatus: string | null;
  hasConflicts: boolean;
  userNotesCount: number;
  changesCount: number;
  assigneeNames: string[];
  diffRefs: GitLabDiffRefs | null;
}

export interface GitLabDiffRefs {
  baseSha: string;
  headSha: string;
  startSha: string;
}

export interface CreateDiffCommentLinePoint {
  oldLine: number | null;
  newLine: number | null;
  type: "old" | "new";
}

export interface CreateDiffCommentInput {
  body: string;
  oldPath: string;
  newPath: string;
  oldLine: number | null;
  newLine: number | null;
  lineRange?: {
    start: CreateDiffCommentLinePoint;
    end: CreateDiffCommentLinePoint;
  };
}

export interface GitLabMergeRequestChange {
  oldPath: string;
  newPath: string;
  diff: string;
  newFile: boolean;
  renamedFile: boolean;
  deletedFile: boolean;
}

export interface GitLabMergeRequestChanges {
  changes: GitLabMergeRequestChange[];
}

export interface GitLabNotePosition {
  oldPath: string | null;
  newPath: string | null;
  oldLine: number | null;
  newLine: number | null;
}

export interface GitLabNote {
  id: number;
  body: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  system: boolean;
  resolvable: boolean;
  resolved: boolean;
  type: string | null;
  position: GitLabNotePosition | null;
}

export interface GitLabDiscussion {
  id: string;
  individualNote: boolean;
  notes: GitLabNote[];
}

export interface GitLabMergeRequestDiscussions {
  discussions: GitLabDiscussion[];
}

export interface GitLabProject {
  id: number;
  name: string;
  pathWithNamespace: string;
  webUrl: string;
  avatarUrl: string | null;
  lastActivityAt: string | null;
}

export interface GitLabProjectReadme {
  fileName: string;
  filePath: string;
  content: string;
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

interface RestGitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  web_url: string;
  state: string;
  draft?: boolean;
  work_in_progress?: boolean;
  source_branch: string;
  target_branch: string;
  updated_at: string;
  created_at?: string;
  merged_at?: string | null;
  closed_at?: string | null;
  description?: string | null;
  labels?: string[];
  merge_status?: string;
  has_conflicts?: boolean;
  user_notes_count?: number;
  changes_count?: string;
  author?: {
    name?: string;
    avatar_url?: string | null;
  };
  assignees?: Array<{ name?: string }>;
  diff_refs?: {
    base_sha?: string;
    head_sha?: string;
    start_sha?: string;
  } | null;
}

interface RestGitLabMergeRequestChange {
  old_path: string;
  new_path: string;
  diff: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
}

interface RestGitLabNotePosition {
  old_path?: string | null;
  new_path?: string | null;
  old_line?: number | null;
  new_line?: number | null;
}

interface RestGitLabNote {
  id: number;
  type?: string | null;
  body: string;
  author?: {
    name?: string;
    username?: string;
    avatar_url?: string | null;
  };
  created_at: string;
  updated_at: string;
  system?: boolean;
  resolvable?: boolean;
  resolved?: boolean;
  position?: RestGitLabNotePosition | null;
}

interface RestGitLabDiscussion {
  id: string;
  individual_note: boolean;
  notes: RestGitLabNote[];
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

const mapRestMergeRequest = (
  mergeRequest: RestGitLabMergeRequest,
): GitLabMergeRequest => ({
  id: mergeRequest.id,
  iid: mergeRequest.iid,
  title: mergeRequest.title,
  webUrl: mergeRequest.web_url,
  state: mergeRequest.state,
  draft: mergeRequest.draft ?? mergeRequest.work_in_progress ?? false,
  sourceBranch: mergeRequest.source_branch,
  targetBranch: mergeRequest.target_branch,
  updatedAt: mergeRequest.updated_at,
  authorName: mergeRequest.author?.name ?? "Unknown",
  authorAvatarUrl: mergeRequest.author?.avatar_url ?? null,
});

const mapRestMergeRequestDetail = (
  mergeRequest: RestGitLabMergeRequest,
): GitLabMergeRequestDetail => ({
  ...mapRestMergeRequest(mergeRequest),
  description: mergeRequest.description ?? "",
  createdAt: mergeRequest.created_at ?? mergeRequest.updated_at,
  mergedAt: mergeRequest.merged_at ?? null,
  closedAt: mergeRequest.closed_at ?? null,
  labels: mergeRequest.labels ?? [],
  mergeStatus: mergeRequest.merge_status ?? null,
  hasConflicts: mergeRequest.has_conflicts ?? false,
  userNotesCount: mergeRequest.user_notes_count ?? 0,
  changesCount: Number(mergeRequest.changes_count ?? 0) || 0,
  assigneeNames: (mergeRequest.assignees ?? [])
    .map((assignee) => assignee.name)
    .filter((name): name is string => Boolean(name)),
  diffRefs: mergeRequest.diff_refs?.base_sha &&
    mergeRequest.diff_refs?.head_sha &&
    mergeRequest.diff_refs?.start_sha
    ? {
        baseSha: mergeRequest.diff_refs.base_sha,
        headSha: mergeRequest.diff_refs.head_sha,
        startSha: mergeRequest.diff_refs.start_sha,
      }
    : null,
});

const mapRestMergeRequestChange = (
  change: RestGitLabMergeRequestChange,
): GitLabMergeRequestChange => ({
  oldPath: change.old_path,
  newPath: change.new_path,
  diff: change.diff,
  newFile: change.new_file,
  renamedFile: change.renamed_file,
  deletedFile: change.deleted_file,
});

const mapRestNotePosition = (
  position: RestGitLabNotePosition | null | undefined,
): GitLabNotePosition | null => {
  if (!position) {
    return null;
  }

  return {
    oldPath: position.old_path ?? null,
    newPath: position.new_path ?? null,
    oldLine: position.old_line ?? null,
    newLine: position.new_line ?? null,
  };
};

const mapRestNote = (note: RestGitLabNote): GitLabNote => ({
  id: note.id,
  body: note.body,
  authorName: note.author?.name ?? "Unknown",
  authorUsername: note.author?.username ?? "unknown",
  authorAvatarUrl: note.author?.avatar_url ?? null,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
  system: note.system ?? false,
  resolvable: note.resolvable ?? false,
  resolved: note.resolved ?? false,
  type: note.type ?? null,
  position: mapRestNotePosition(note.position),
});

const mapRestDiscussion = (discussion: RestGitLabDiscussion): GitLabDiscussion => ({
  id: discussion.id,
  individualNote: discussion.individual_note,
  notes: (discussion.notes ?? []).map(mapRestNote),
});

const gitlabFetch = async (
  connection: GitLabConnection,
  path: string,
  signal?: AbortSignal,
) => {
  const baseUrl = normalizeGitlabBaseUrl(connection.gitlabUrl);
  const response = await fetch(`${baseUrl}/api/v4${path}`, {
    headers: {
      "PRIVATE-TOKEN": connection.gitToken,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.status}`);
  }

  return response;
};

const gitlabPost = async <T>(
  connection: GitLabConnection,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> => {
  const baseUrl = normalizeGitlabBaseUrl(connection.gitlabUrl);
  const response = await fetch(`${baseUrl}/api/v4${path}`, {
    method: "POST",
    headers: {
      "PRIVATE-TOKEN": connection.gitToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

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

interface RestGitLabProjectReadme {
  file_name: string;
  file_path: string;
  content: string;
  encoding?: string;
}

const fetchProject = async (
  connection: GitLabConnection,
  projectId: number,
  signal?: AbortSignal,
): Promise<GitLabProject> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${projectId}`,
    signal,
  );

  const project = (await response.json()) as RestGitLabProject;
  return mapRestProject(project);
};

const fetchProjectReadme = async (
  connection: GitLabConnection,
  projectId: number,
  signal?: AbortSignal,
): Promise<GitLabProjectReadme | null> => {
  try {
    const response = await gitlabFetch(
      connection,
      `/projects/${projectId}/repository/readme`,
      signal,
    );

    const readme = (await response.json()) as RestGitLabProjectReadme;
    const content =
      readme.encoding === "base64"
        ? atob(readme.content)
        : readme.content;

    return {
      fileName: readme.file_name,
      filePath: readme.file_path,
      content,
    };
  } catch {
    return null;
  }
};

const fetchRepositoryFileContent = async (
  connection: GitLabConnection,
  projectId: number,
  filePath: string,
  ref: string,
  signal?: AbortSignal,
): Promise<string> => {
  const encodedPath = encodeURIComponent(filePath);
  const response = await gitlabFetch(
    connection,
    `/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${encodeURIComponent(ref)}`,
    signal,
  );

  return response.text();
};

const fetchProjectMergeRequests = async (
  connection: GitLabConnection,
  project: GitLabProject,
  options?: { limit?: number; signal?: AbortSignal },
): Promise<GitLabMergeRequest[]> => {
  const limit = options?.limit ?? 20;
  const params = new URLSearchParams({
    state: "opened",
    order_by: "updated_at",
    sort: "desc",
    per_page: String(limit),
  });

  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests?${params.toString()}`,
    options?.signal,
  );

  const mergeRequests = (await response.json()) as RestGitLabMergeRequest[];
  return mergeRequests.map(mapRestMergeRequest);
};

const fetchMergeRequestDetail = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestDetail> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}`,
    signal,
  );

  const mergeRequest = (await response.json()) as RestGitLabMergeRequest;
  return mapRestMergeRequestDetail(mergeRequest);
};

const fetchMergeRequestChanges = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestChanges> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/changes`,
    signal,
  );

  const payload = (await response.json()) as {
    changes?: RestGitLabMergeRequestChange[];
  };

  return {
    changes: (payload.changes ?? []).map(mapRestMergeRequestChange),
  };
};

const fetchMergeRequestDiscussions = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestDiscussions> => {
  const params = new URLSearchParams({
    per_page: "100",
    sort: "asc",
  });

  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions?${params.toString()}`,
    signal,
  );

  const discussions = (await response.json()) as RestGitLabDiscussion[];

  return {
    discussions: discussions
      .map(mapRestDiscussion)
      .filter((discussion) => discussion.notes.length > 0)
      .sort((left, right) => {
        const leftTime = new Date(left.notes[0].createdAt).getTime();
        const rightTime = new Date(right.notes[0].createdAt).getTime();
        return leftTime - rightTime;
      }),
  };
};

const createMergeRequestDiffDiscussion = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  diffRefs: GitLabDiffRefs,
  input: CreateDiffCommentInput,
  signal?: AbortSignal,
): Promise<GitLabDiscussion> => {
  const lineRange = input.lineRange
    ? await buildGitLabLineRangePayload({
        filePath: input.newPath,
        start: input.lineRange.start,
        end: input.lineRange.end,
      })
    : undefined;

  const discussion = await gitlabPost<RestGitLabDiscussion>(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions`,
    {
      body: input.body,
      position: {
        position_type: "text",
        base_sha: diffRefs.baseSha,
        head_sha: diffRefs.headSha,
        start_sha: diffRefs.startSha,
        old_path: input.oldPath,
        new_path: input.newPath,
        old_line: input.oldLine,
        new_line: input.newLine,
        ...(lineRange ? { line_range: lineRange } : {}),
      },
    },
    signal,
  );

  return mapRestDiscussion(discussion);
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

  async getProject(
    connection: GitLabConnection,
    projectId: number,
    signal?: AbortSignal,
  ): Promise<GitLabProject> {
    return fetchProject(connection, projectId, signal);
  },

  async getProjectReadme(
    connection: GitLabConnection,
    projectId: number,
    signal?: AbortSignal,
  ): Promise<GitLabProjectReadme | null> {
    return fetchProjectReadme(connection, projectId, signal);
  },

  async getRepositoryFileContent(
    connection: GitLabConnection,
    projectId: number,
    filePath: string,
    ref: string,
    signal?: AbortSignal,
  ): Promise<string> {
    return fetchRepositoryFileContent(
      connection,
      projectId,
      filePath,
      ref,
      signal,
    );
  },

  async getProjectMergeRequests(
    connection: GitLabConnection,
    project: GitLabProject,
    options?: { limit?: number; signal?: AbortSignal },
  ): Promise<GitLabMergeRequest[]> {
    return fetchProjectMergeRequests(connection, project, options);
  },

  async getMergeRequestDetail(
    connection: GitLabConnection,
    project: GitLabProject,
    mergeRequestIid: number,
    signal?: AbortSignal,
  ): Promise<GitLabMergeRequestDetail> {
    return fetchMergeRequestDetail(
      connection,
      project,
      mergeRequestIid,
      signal,
    );
  },

  async getMergeRequestChanges(
    connection: GitLabConnection,
    project: GitLabProject,
    mergeRequestIid: number,
    signal?: AbortSignal,
  ): Promise<GitLabMergeRequestChanges> {
    return fetchMergeRequestChanges(
      connection,
      project,
      mergeRequestIid,
      signal,
    );
  },

  async getMergeRequestDiscussions(
    connection: GitLabConnection,
    project: GitLabProject,
    mergeRequestIid: number,
    signal?: AbortSignal,
  ): Promise<GitLabMergeRequestDiscussions> {
    return fetchMergeRequestDiscussions(
      connection,
      project,
      mergeRequestIid,
      signal,
    );
  },

  async createMergeRequestDiffDiscussion(
    connection: GitLabConnection,
    project: GitLabProject,
    mergeRequestIid: number,
    diffRefs: GitLabDiffRefs,
    input: CreateDiffCommentInput,
    signal?: AbortSignal,
  ): Promise<GitLabDiscussion> {
    return createMergeRequestDiffDiscussion(
      connection,
      project,
      mergeRequestIid,
      diffRefs,
      input,
      signal,
    );
  },

  async getMergeRequestView(
    connection: GitLabConnection,
    project: GitLabProject,
    mergeRequestIid: number,
    signal?: AbortSignal,
  ) {
    const [detail, changes, discussions] = await Promise.all([
      fetchMergeRequestDetail(connection, project, mergeRequestIid, signal),
      fetchMergeRequestChanges(connection, project, mergeRequestIid, signal),
      fetchMergeRequestDiscussions(connection, project, mergeRequestIid, signal),
    ]);

    return { detail, changes, discussions };
  },
};
