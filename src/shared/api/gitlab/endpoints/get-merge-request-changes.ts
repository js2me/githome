import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { buildUnifiedDiffFromGitlabLines } from "@/shared/lib/gitlab/build-unified-diff-from-gitlab-lines";
import {
  buildGitlabPath,
  buildMergeRequestWebPath,
  fetchGitlabJson,
  gitlabFetch,
  gitlabWebFetch,
} from "../client";
import type {
  GitLabDiffsBatchFileDC,
  GitLabDiffsBatchResponseDC,
  GitLabMergeRequestChangeDC,
  GitLabMergeRequestDC,
  GitLabMergeRequestVersionDC,
  GitLabProjectDC,
} from "../data-contracts";
import { getMergeRequestDetail } from "./get-merge-request-detail";

interface GitLabCompareDiffDC {
  old_path: string;
  new_path: string;
  diff?: string;
  new_file?: boolean;
  renamed_file?: boolean;
  deleted_file?: boolean;
}

interface GitLabCompareResponseDC {
  diffs?: GitLabCompareDiffDC[];
  compare_timeout?: boolean;
}

interface GitLabDiffFileMetadataDC {
  generated_file?: boolean;
  collapsed?: boolean;
  too_large?: boolean;
  added_lines?: number;
  removed_lines?: number;
}

const getDiffFileMetadataKey = (oldPath: string, newPath: string) =>
  `${oldPath}\0${newPath}`;

const mapCompareDiffToChange = (
  diff: GitLabCompareDiffDC,
): GitLabMergeRequestChangeDC => ({
  old_path: diff.old_path,
  new_path: diff.new_path,
  diff: diff.diff ?? "",
  new_file: Boolean(diff.new_file),
  renamed_file: Boolean(diff.renamed_file),
  deleted_file: Boolean(diff.deleted_file),
});

const mapBatchFileToChange = (
  file: GitLabDiffsBatchFileDC,
): GitLabMergeRequestChangeDC => {
  let diff = file.diff ?? "";
  if (!diff && file.highlighted_diff_lines?.length) {
    diff = buildUnifiedDiffFromGitlabLines(file.highlighted_diff_lines);
  }

  return {
    old_path: file.old_path,
    new_path: file.new_path,
    diff,
    new_file: Boolean(file.new_file),
    renamed_file: Boolean(file.renamed_file),
    deleted_file: Boolean(file.deleted_file),
    too_large: file.too_large,
    collapsed: file.collapsed,
    generated_file: file.generated_file,
    added_lines: file.added_lines,
    removed_lines: file.removed_lines,
    file_hash: file.file_hash,
  };
};

const fetchAllMergeRequestDiffs = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  versionId: number | undefined,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestChangeDC[]> => {
  const basePath = `/projects/${project.id}/merge_requests/${mergeRequestIid}`;

  if (versionId !== undefined) {
    const version = await fetchGitlabJson<{ diffs: GitLabMergeRequestChangeDC[] }>(
      connection,
      `${basePath}/versions/${versionId}`,
      { query: { unidiff: true }, signal },
    );

    if (!Array.isArray(version.diffs)) {
      throw new Error("GitLab did not return diffs for this merge request version");
    }

    return version.diffs;
  }

  const allDiffs: GitLabMergeRequestChangeDC[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: "100",
      unidiff: "true",
    });

    const response = await gitlabFetch(
      connection,
      `${basePath}/diffs?${params}`,
      signal,
      { cache: "no-store" },
    );

    const pageDiffs = (await response.json()) as GitLabMergeRequestChangeDC[];
    allDiffs.push(...pageDiffs);

    const nextPage = response.headers.get("x-next-page");
    if (!nextPage) {
      break;
    }

    page = Number(nextPage);
  }

  return allDiffs;
};

const enrichChangesWithDiffMetadata = (
  changes: GitLabMergeRequestChangeDC[],
  metadata: Map<string, GitLabDiffFileMetadataDC>,
): GitLabMergeRequestChangeDC[] =>
  changes.map((change) => {
    const meta = metadata.get(
      getDiffFileMetadataKey(change.old_path, change.new_path),
    );

    if (!meta) {
      return change;
    }

    return {
      ...change,
      generated_file: meta.generated_file || undefined,
      collapsed: meta.collapsed || undefined,
      too_large: meta.too_large || change.too_large,
      added_lines: meta.added_lines ?? change.added_lines,
      removed_lines: meta.removed_lines ?? change.removed_lines,
    };
  });

const enrichChangesFromDiffsApi = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  versionId: number | undefined,
  changes: GitLabMergeRequestChangeDC[],
  signal?: AbortSignal,
): Promise<GitLabMergeRequestChangeDC[]> => {
  try {
    const diffs = await fetchAllMergeRequestDiffs(
      connection,
      project,
      mergeRequestIid,
      versionId,
      signal,
    );
    const metadata = new Map(
      diffs.map((file) => [
        getDiffFileMetadataKey(file.old_path, file.new_path),
        file,
      ]),
    );

    return enrichChangesWithDiffMetadata(changes, metadata);
  } catch {
    return changes;
  }
};

const fetchMergeRequestDiffsBatch = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  versionId: number | undefined,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestChangeDC[]> => {
  const allDiffs: GitLabMergeRequestChangeDC[] = [];
  let page = 1;

  while (true) {
    const path = buildMergeRequestWebPath(
      project.path_with_namespace,
      mergeRequestIid,
      "diffs_batch.json",
    );

    const queryParams: Record<string, string | number | boolean> = {
      w: 0,
      view: "inline",
      page,
      per_page: 100,
    };

    if (versionId !== undefined) {
      queryParams.diff_id = versionId;
    } else {
      queryParams.diff_head = true;
    }

    const response = await gitlabWebFetch(
      connection,
      buildGitlabPath(path, queryParams),
      signal,
      versionId === undefined ? { cache: "no-store" } : undefined,
    );

    const payload = (await response.json()) as GitLabDiffsBatchResponseDC;

    for (const file of payload.diff_files) {
      allDiffs.push(mapBatchFileToChange(file));
    }

    const nextPage = Number(response.headers.get("x-next-page"));
    if (nextPage > page) {
      page = nextPage;
    } else if (page < (payload.pagination?.total_pages ?? 0)) {
      page += 1;
    } else {
      break;
    }
  }

  return allDiffs;
};

const fetchMergeRequestChangesViaCompare = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  from: string,
  to: string,
  signal?: AbortSignal,
  cache?: RequestCache,
): Promise<GitLabMergeRequestChangeDC[]> => {
  const payload = await fetchGitlabJson<GitLabCompareResponseDC>(
    connection,
    `/projects/${project.id}/repository/compare`,
    {
      query: {
        from,
        to,
        unidiff: true,
      },
      signal,
      cache,
    },
  );

  if (payload.compare_timeout) {
    throw new Error("GitLab compare timeout");
  }

  return (payload.diffs ?? []).map(mapCompareDiffToChange);
};

export const getMergeRequestChanges = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  versionId?: number | null,
  version?: GitLabMergeRequestVersionDC | null,
  signal?: AbortSignal,
  detail?: GitLabMergeRequestDC,
): Promise<GitLabMergeRequestChangeDC[]> => {
  const resolvedVersionId = versionId ?? undefined;

  // 1. diffs_batch.json — web UI, совпадает с поведением GitLab (collapsed/generated)
  try {
    return await fetchMergeRequestDiffsBatch(
      connection,
      project,
      mergeRequestIid,
      resolvedVersionId,
      signal,
    );
  } catch {
    // endpoint может отсутствовать или требовать browser session
  }

  // 2. REST /diffs или /versions/:id — метаданные generated_file/collapsed
  try {
    return await fetchAllMergeRequestDiffs(
      connection,
      project,
      mergeRequestIid,
      resolvedVersionId,
      signal,
    );
  } catch {
    // может не работать на некоторых инстансах
  }

  // 3. repository/compare — работает с PAT; обогащаем метаданными из /diffs
  let startSha: string | undefined;
  let headSha: string | undefined;
  let targetBranch: string | undefined;
  let isOpen = false;

  if (version) {
    startSha = version.start_commit_sha;
    headSha = version.head_commit_sha;
  } else if (resolvedVersionId === undefined) {
    const mergeRequest = detail ?? (await getMergeRequestDetail(
      connection,
      project,
      mergeRequestIid,
      signal,
    ));
    const refs = mergeRequest.diff_refs ?? {};
    startSha = refs.start_sha;
    headSha = refs.head_sha;
    targetBranch = mergeRequest.target_branch;
    isOpen = mergeRequest.state === "opened";
  }

  if (isOpen && !version && targetBranch && headSha) {
    try {
      const changes = await fetchMergeRequestChangesViaCompare(
        connection,
        project,
        targetBranch,
        headSha,
        signal,
        "no-store",
      );

      return enrichChangesFromDiffsApi(
        connection,
        project,
        mergeRequestIid,
        resolvedVersionId,
        changes,
        signal,
      );
    } catch {
      // target branch ref may be unresolvable or compare may time out
    }
  }

  if (startSha && headSha) {
    try {
      const changes = await fetchMergeRequestChangesViaCompare(
        connection,
        project,
        startSha,
        headSha,
        signal,
      );

      return enrichChangesFromDiffsApi(
        connection,
        project,
        mergeRequestIid,
        resolvedVersionId,
        changes,
        signal,
      );
    } catch {
      // compare can time out on very large diffs
    }
  }

  throw new Error("Failed to fetch merge request changes");
};
