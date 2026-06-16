import { buildGitLabLineRangePayload } from "@/shared/lib/gitlab-line-code";
import { splitRawDiffByFile } from "@/shared/lib/split-raw-diff";

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
  collapsed?: boolean;
  generatedFile?: boolean;
  tooLarge?: boolean;
}

export interface GitLabMergeRequestChanges {
  changes: GitLabMergeRequestChange[];
}

export interface GitLabNotePositionLinePoint {
  type?: string | null;
  oldLine?: number | null;
  newLine?: number | null;
  lineCode?: string | null;
}

export interface GitLabNotePosition {
  oldPath: string | null;
  newPath: string | null;
  oldLine: number | null;
  newLine: number | null;
  lineRange?: {
    start?: GitLabNotePositionLinePoint | null;
    end?: GitLabNotePositionLinePoint | null;
  } | null;
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

export interface GitLabUserSummary {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface GitLabMergeRequestApprover {
  user: GitLabUserSummary;
  approvedAt: string;
}

export type GitLabMergeRequestReviewerState =
  | "unreviewed"
  | "reviewing"
  | "reviewed"
  | "requested_changes"
  | string;

export interface GitLabMergeRequestReviewer {
  user: GitLabUserSummary;
  state: GitLabMergeRequestReviewerState;
  createdAt: string;
}

export interface GitLabMergeRequestApprovalView {
  approvalsRequired: number | null;
  approvalsLeft: number | null;
  approved: boolean;
  approvedBy: GitLabMergeRequestApprover[];
  reviewers: GitLabMergeRequestReviewer[];
  currentUserId: number | null;
  currentUserApproved: boolean;
  currentUserRequestedChanges: boolean;
  approvalsAvailable: boolean;
}

export interface GitLabProject {
  id: number;
  name: string;
  pathWithNamespace: string;
  webUrl: string;
  avatarUrl: string | null;
  lastActivityAt: string | null;
  defaultBranch: string | null;
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
  default_branch?: string | null;
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
  too_large?: boolean;
  collapsed?: boolean;
  generated_file?: boolean;
}

interface RestGitLabNotePositionLinePoint {
  type?: string | null;
  old_line?: number | null;
  new_line?: number | null;
  line_code?: string | null;
}

interface RestGitLabNotePosition {
  old_path?: string | null;
  new_path?: string | null;
  old_line?: number | null;
  new_line?: number | null;
  line_range?: {
    start?: RestGitLabNotePositionLinePoint | null;
    end?: RestGitLabNotePositionLinePoint | null;
  } | null;
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

interface RestGitLabUser {
  id: number;
  name: string;
  username: string;
  avatar_url?: string | null;
}

interface RestGitLabMergeRequestApprovals {
  approvals_required?: number;
  approvals_left?: number;
  approved?: boolean;
  approved_by?: Array<{
    user: RestGitLabUser;
    approved_at: string;
  }>;
}

interface RestGitLabMergeRequestReviewer {
  user: RestGitLabUser;
  state: string;
  created_at: string;
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
  defaultBranch: null,
});

const mapRestProject = (project: RestGitLabProject): GitLabProject => ({
  id: project.id,
  name: project.name,
  pathWithNamespace: project.path_with_namespace,
  webUrl: project.web_url,
  avatarUrl: project.avatar_url ?? null,
  lastActivityAt: project.last_activity_at ?? null,
  defaultBranch: project.default_branch ?? null,
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
  collapsed: change.collapsed,
  generatedFile: change.generated_file,
  tooLarge: change.too_large,
});

const toLineNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const mapRestNotePositionLinePoint = (
  point: RestGitLabNotePositionLinePoint | null | undefined,
) => {
  if (!point) {
    return null;
  }

  return {
    type: point.type ?? null,
    oldLine: toLineNumber(point.old_line),
    newLine: toLineNumber(point.new_line),
    lineCode: point.line_code ?? null,
  };
};

const mapRestNotePosition = (
  position: RestGitLabNotePosition | null | undefined,
): GitLabNotePosition | null => {
  if (!position) {
    return null;
  }

  return {
    oldPath: position.old_path ?? null,
    newPath: position.new_path ?? null,
    oldLine: toLineNumber(position.old_line),
    newLine: toLineNumber(position.new_line),
    lineRange: position.line_range
      ? {
          start: mapRestNotePositionLinePoint(position.line_range.start),
          end: mapRestNotePositionLinePoint(position.line_range.end),
        }
      : null,
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

const mapRestUserSummary = (user: RestGitLabUser): GitLabUserSummary => ({
  id: user.id,
  name: user.name,
  username: user.username,
  avatarUrl: user.avatar_url ?? null,
});

const mapRestMergeRequestApprover = (entry: {
  user: RestGitLabUser;
  approved_at: string;
}): GitLabMergeRequestApprover => ({
  user: mapRestUserSummary(entry.user),
  approvedAt: entry.approved_at,
});

const mapRestMergeRequestReviewer = (
  reviewer: RestGitLabMergeRequestReviewer,
): GitLabMergeRequestReviewer => ({
  user: mapRestUserSummary(reviewer.user),
  state: reviewer.state,
  createdAt: reviewer.created_at,
});

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

const gitlabGraphql = async <T>(
  connection: GitLabConnection,
  query: string,
  variables?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> => {
  const baseUrl = normalizeGitlabBaseUrl(connection.gitlabUrl);
  const response = await fetch(`${baseUrl}/api/graphql`, {
    method: "POST",
    headers: {
      "PRIVATE-TOKEN": connection.gitToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    signal,
  });

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

const gitlabPut = async <T>(
  connection: GitLabConnection,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> => {
  const baseUrl = normalizeGitlabBaseUrl(connection.gitlabUrl);
  const response = await fetch(`${baseUrl}/api/v4${path}`, {
    method: "PUT",
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

const decodeGitLabBase64Content = (value: string) => {
  const normalized = value.replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const parseProjectReadmeResponse = (
  readme: RestGitLabProjectReadme,
): GitLabProjectReadme => {
  const content =
    readme.encoding === "base64"
      ? decodeGitLabBase64Content(readme.content)
      : readme.content;

  return {
    fileName: readme.file_name,
    filePath: readme.file_path,
    content,
  };
};

const README_FALLBACK_PATHS = [
  "README.md",
  "Readme.md",
  "readme.md",
  "README.MD",
] as const;

const fetchProjectReadmeFromFile = async (
  connection: GitLabConnection,
  projectId: number,
  ref: string,
  signal?: AbortSignal,
): Promise<GitLabProjectReadme | null> => {
  for (const filePath of README_FALLBACK_PATHS) {
    try {
      const content = await fetchRepositoryFileContent(
        connection,
        projectId,
        filePath,
        ref,
        signal,
      );

      return {
        fileName: filePath.split("/").pop() ?? filePath,
        filePath,
        content,
      };
    } catch {
      continue;
    }
  }

  return null;
};

const fetchProjectReadme = async (
  connection: GitLabConnection,
  projectId: number,
  options?: { ref?: string | null; signal?: AbortSignal },
): Promise<GitLabProjectReadme | null> => {
  const signal = options?.signal;
  const ref = options?.ref?.trim() || null;
  const readmePath = ref
    ? `/projects/${projectId}/repository/readme?ref=${encodeURIComponent(ref)}`
    : `/projects/${projectId}/repository/readme`;

  try {
    const response = await gitlabFetch(connection, readmePath, signal);
    const readme = (await response.json()) as RestGitLabProjectReadme;
    return parseProjectReadmeResponse(readme);
  } catch {
    const refsToTry = ref ? [ref, "HEAD"] : ["HEAD"];

    for (const nextRef of refsToTry) {
      const readme = await fetchProjectReadmeFromFile(
        connection,
        projectId,
        nextRef,
        signal,
      );

      if (readme) {
        return readme;
      }
    }

    return null;
  }
};

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

const fetchAllMergeRequestDiffs = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<RestGitLabMergeRequestChange[]> => {
  const allDiffs: RestGitLabMergeRequestChange[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: "100",
      unidiff: "true",
    });

    const response = await gitlabFetch(
      connection,
      `/projects/${project.id}/merge_requests/${mergeRequestIid}/diffs?${params.toString()}`,
      signal,
    );

    const batch = (await response.json()) as RestGitLabMergeRequestChange[];
    allDiffs.push(...batch);

    const nextPage = response.headers.get("X-Next-Page");
    if (!nextPage) {
      break;
    }

    page = Number(nextPage);
  }

  return allDiffs;
};

const fetchMergeRequestRawDiffs = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<string> => {
  const baseUrl = normalizeGitlabBaseUrl(connection.gitlabUrl);
  const response = await fetch(
    `${baseUrl}/api/v4/projects/${project.id}/merge_requests/${mergeRequestIid}/raw_diffs`,
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

  return response.text();
};

const fetchMergeRequestChangesFromChangesEndpoint = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<RestGitLabMergeRequestChange[]> => {
  const params = new URLSearchParams({
    access_raw_diffs: "true",
    unidiff: "true",
  });

  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/changes?${params.toString()}`,
    signal,
  );

  const payload = (await response.json()) as {
    changes?: RestGitLabMergeRequestChange[];
  };

  return payload.changes ?? [];
};

const mergeMissingDiffs = (
  diffs: RestGitLabMergeRequestChange[],
  source: Map<string, string>,
) =>
  diffs.map((change) => {
    if (change.diff?.trim() || change.too_large) {
      return change;
    }

    const fromSource =
      source.get(change.new_path) ?? source.get(change.old_path) ?? "";

    if (!fromSource.trim()) {
      return change;
    }

    return {
      ...change,
      diff: fromSource,
    };
  });

const fetchMergeRequestChanges = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestChanges> => {
  let diffs = await fetchAllMergeRequestDiffs(
    connection,
    project,
    mergeRequestIid,
    signal,
  );

  const hasMissingDiffs = diffs.some(
    (change) => !change.diff?.trim() && !change.too_large,
  );

  if (hasMissingDiffs) {
    try {
      const rawDiffs = await fetchMergeRequestRawDiffs(
        connection,
        project,
        mergeRequestIid,
        signal,
      );
      diffs = mergeMissingDiffs(diffs, splitRawDiffByFile(rawDiffs));
    } catch {
      // raw_diffs is unavailable on older GitLab versions
    }
  }

  const stillMissingDiffs = diffs.some(
    (change) => !change.diff?.trim() && !change.too_large,
  );

  if (stillMissingDiffs) {
    try {
      const changesFromEndpoint = await fetchMergeRequestChangesFromChangesEndpoint(
        connection,
        project,
        mergeRequestIid,
        signal,
      );
      const changesByPath = new Map<string, string>();

      for (const change of changesFromEndpoint) {
        if (!change.diff?.trim()) {
          continue;
        }

        changesByPath.set(change.new_path, change.diff);
        if (change.old_path !== change.new_path) {
          changesByPath.set(change.old_path, change.diff);
        }
      }

      diffs = mergeMissingDiffs(diffs, changesByPath);
    } catch {
      // keep partial diffs
    }
  }

  return {
    changes: diffs.map(mapRestMergeRequestChange),
  };
};

const fetchMergeRequestDiscussions = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestDiscussions> => {
  const discussions: RestGitLabDiscussion[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      per_page: "100",
      page: String(page),
      sort: "asc",
    });

    const response = await gitlabFetch(
      connection,
      `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions?${params.toString()}`,
      signal,
    );

    const batch = (await response.json()) as RestGitLabDiscussion[];
    discussions.push(...batch);

    const nextPage = response.headers.get("x-next-page");
    if (!nextPage) {
      break;
    }

    page = Number(nextPage);
    if (!Number.isFinite(page) || page <= 0) {
      break;
    }
  }

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

  const isFileComment =
    input.oldLine === null &&
    input.newLine === null &&
    !lineRange;

  const discussion = await gitlabPost<RestGitLabDiscussion>(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions`,
    {
      body: input.body,
      position: {
        position_type: isFileComment ? "file" : "text",
        base_sha: diffRefs.baseSha,
        head_sha: diffRefs.headSha,
        start_sha: diffRefs.startSha,
        old_path: input.oldPath,
        new_path: input.newPath,
        ...(input.oldLine !== null ? { old_line: input.oldLine } : {}),
        ...(input.newLine !== null ? { new_line: input.newLine } : {}),
        ...(lineRange ? { line_range: lineRange } : {}),
      },
    },
    signal,
  );

  return mapRestDiscussion(discussion);
};

const resolveMergeRequestDiscussion = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  discussionId: string,
  resolved: boolean,
  signal?: AbortSignal,
): Promise<GitLabDiscussion> => {
  const discussion = await gitlabPut<RestGitLabDiscussion>(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions/${encodeURIComponent(discussionId)}`,
    { resolved },
    signal,
  );

  return mapRestDiscussion(discussion);
};

const fetchCurrentUserId = async (
  connection: GitLabConnection,
  signal?: AbortSignal,
): Promise<number | null> => {
  const response = await gitlabFetch(connection, "/user", signal);
  const user = (await response.json()) as RestGitLabUser;
  return user.id ?? null;
};

const fetchMergeRequestApprovals = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<{
  approvalsRequired: number | null;
  approvalsLeft: number | null;
  approved: boolean;
  approvedBy: GitLabMergeRequestApprover[];
}> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/approvals`,
    signal,
  );

  const payload = (await response.json()) as RestGitLabMergeRequestApprovals;

  return {
    approvalsRequired: payload.approvals_required ?? null,
    approvalsLeft: payload.approvals_left ?? null,
    approved: payload.approved ?? false,
    approvedBy: (payload.approved_by ?? []).map(mapRestMergeRequestApprover),
  };
};

const fetchMergeRequestReviewers = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestReviewer[]> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/reviewers`,
    signal,
  );

  const reviewers = (await response.json()) as RestGitLabMergeRequestReviewer[];
  return reviewers.map(mapRestMergeRequestReviewer);
};

const fetchMergeRequestApprovalView = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestApprovalView> => {
  const [currentUserId, approvalsResult, reviewers] = await Promise.all([
    fetchCurrentUserId(connection, signal).catch(() => null),
    fetchMergeRequestApprovals(connection, project, mergeRequestIid, signal).catch(
      () => null,
    ),
    fetchMergeRequestReviewers(connection, project, mergeRequestIid, signal).catch(
      () => [] as GitLabMergeRequestReviewer[],
    ),
  ]);

  const approvedBy = approvalsResult?.approvedBy ?? [];
  const currentUserApproved =
    currentUserId !== null &&
    approvedBy.some((entry) => entry.user.id === currentUserId);

  const currentUserReviewer = reviewers.find(
    (reviewer) => reviewer.user.id === currentUserId,
  );
  const currentUserRequestedChanges =
    currentUserReviewer?.state === "requested_changes";

  return {
    approvalsRequired: approvalsResult?.approvalsRequired ?? null,
    approvalsLeft: approvalsResult?.approvalsLeft ?? null,
    approved: approvalsResult?.approved ?? false,
    approvedBy,
    reviewers,
    currentUserId,
    currentUserApproved,
    currentUserRequestedChanges,
    approvalsAvailable: approvalsResult !== null,
  };
};

const approveMergeRequest = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  options?: { sha?: string | null; signal?: AbortSignal },
): Promise<void> => {
  const body =
    options?.sha && options.sha.trim()
      ? { sha: options.sha.trim() }
      : {};

  await gitlabPost(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/approve`,
    body,
    options?.signal,
  );
};

const unapproveMergeRequest = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<void> => {
  await gitlabPost(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/unapprove`,
    {},
    signal,
  );
};

const ensureCurrentUserReviewer = async (
  connection: GitLabConnection,
  projectPath: string,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<void> => {
  const data = await gitlabGraphql<{
    currentUser: { username: string } | null;
    project: {
      mergeRequest: {
        reviewers: { nodes: Array<{ username: string }> };
      } | null;
    } | null;
  }>(
    connection,
    `
      query EnsureReviewer($projectPath: ID!, $iid: String!) {
        currentUser {
          username
        }
        project(fullPath: $projectPath) {
          mergeRequest(iid: $iid) {
            reviewers {
              nodes {
                username
              }
            }
          }
        }
      }
    `,
    { projectPath, iid: String(mergeRequestIid) },
    signal,
  );

  const username = data.currentUser?.username;
  const reviewers = data.project?.mergeRequest?.reviewers.nodes ?? [];

  if (!username) {
    return;
  }

  if (reviewers.some((reviewer) => reviewer.username === username)) {
    return;
  }

  const mutationResult = await gitlabGraphql<{
    mergeRequestSetReviewers: {
      errors: string[];
    };
  }>(
    connection,
    `
      mutation AddReviewer($projectPath: ID!, $iid: String!, $username: String!) {
        mergeRequestSetReviewers(
          input: {
            projectPath: $projectPath
            iid: $iid
            reviewerUsernames: [$username]
            operationMode: APPEND
          }
        ) {
          errors
        }
      }
    `,
    { projectPath, iid: String(mergeRequestIid), username },
    signal,
  );

  const errors = mutationResult.mergeRequestSetReviewers.errors;
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
};

const requestMergeRequestChanges = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<void> => {
  await ensureCurrentUserReviewer(
    connection,
    project.pathWithNamespace,
    mergeRequestIid,
    signal,
  );

  const result = await gitlabGraphql<{
    mergeRequestRequestChanges: {
      errors: string[];
    };
  }>(
    connection,
    `
      mutation RequestChanges($projectPath: ID!, $iid: String!) {
        mergeRequestRequestChanges(input: { projectPath: $projectPath, iid: $iid }) {
          errors
        }
      }
    `,
    {
      projectPath: project.pathWithNamespace,
      iid: String(mergeRequestIid),
    },
    signal,
  );

  const errors = result.mergeRequestRequestChanges.errors;
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
};

const cancelMergeRequestRequestedChanges = async (
  connection: GitLabConnection,
  project: GitLabProject,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<void> => {
  const result = await gitlabGraphql<{
    mergeRequestDestroyRequestedChanges: {
      errors: string[];
    };
  }>(
    connection,
    `
      mutation CancelRequestChanges($projectPath: ID!, $iid: String!) {
        mergeRequestDestroyRequestedChanges(
          input: { projectPath: $projectPath, iid: $iid }
        ) {
          errors
        }
      }
    `,
    {
      projectPath: project.pathWithNamespace,
      iid: String(mergeRequestIid),
    },
    signal,
  );

  const errors = result.mergeRequestDestroyRequestedChanges.errors;
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
};

interface RestGitLabMarkdownResponse {
  html: string;
}

const renderMarkdown = async (
  connection: GitLabConnection,
  options: {
    text: string;
    projectPath?: string;
    signal?: AbortSignal;
  },
): Promise<string> => {
  const response = await gitlabPost<RestGitLabMarkdownResponse>(
    connection,
    "/markdown",
    {
      text: options.text,
      gfm: true,
      ...(options.projectPath ? { project: options.projectPath } : {}),
    },
    options.signal,
  );

  return response.html;
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
    options?: { ref?: string | null; signal?: AbortSignal },
  ): Promise<GitLabProjectReadme | null> {
    return fetchProjectReadme(connection, projectId, options);
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

  async resolveMergeRequestDiscussion(
    connection: GitLabConnection,
    project: GitLabProject,
    mergeRequestIid: number,
    discussionId: string,
    resolved: boolean,
    signal?: AbortSignal,
  ): Promise<GitLabDiscussion> {
    return resolveMergeRequestDiscussion(
      connection,
      project,
      mergeRequestIid,
      discussionId,
      resolved,
      signal,
    );
  },

  async getMergeRequestView(
    connection: GitLabConnection,
    project: GitLabProject,
    mergeRequestIid: number,
    signal?: AbortSignal,
  ) {
    const [detail, changes, discussions, approvals] = await Promise.all([
      fetchMergeRequestDetail(connection, project, mergeRequestIid, signal),
      fetchMergeRequestChanges(connection, project, mergeRequestIid, signal),
      fetchMergeRequestDiscussions(connection, project, mergeRequestIid, signal),
      fetchMergeRequestApprovalView(connection, project, mergeRequestIid, signal),
    ]);

    return { detail, changes, discussions, approvals };
  },

  async approveMergeRequest(
    connection: GitLabConnection,
    project: GitLabProject,
    mergeRequestIid: number,
    options?: { sha?: string | null; signal?: AbortSignal },
  ): Promise<void> {
    return approveMergeRequest(connection, project, mergeRequestIid, options);
  },

  async unapproveMergeRequest(
    connection: GitLabConnection,
    project: GitLabProject,
    mergeRequestIid: number,
    signal?: AbortSignal,
  ): Promise<void> {
    return unapproveMergeRequest(connection, project, mergeRequestIid, signal);
  },

  async requestMergeRequestChanges(
    connection: GitLabConnection,
    project: GitLabProject,
    mergeRequestIid: number,
    signal?: AbortSignal,
  ): Promise<void> {
    return requestMergeRequestChanges(
      connection,
      project,
      mergeRequestIid,
      signal,
    );
  },

  async cancelMergeRequestRequestedChanges(
    connection: GitLabConnection,
    project: GitLabProject,
    mergeRequestIid: number,
    signal?: AbortSignal,
  ): Promise<void> {
    return cancelMergeRequestRequestedChanges(
      connection,
      project,
      mergeRequestIid,
      signal,
    );
  },

  async renderMarkdown(
    connection: GitLabConnection,
    options: {
      text: string;
      projectPath?: string;
      signal?: AbortSignal;
    },
  ): Promise<string> {
    return renderMarkdown(connection, options);
  },
};
