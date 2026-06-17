import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabMergeRequestChangeDC, GitLabProjectDC } from "../data-contracts";
import { splitRawDiffByFile } from "@/shared/lib/gitlab/split-raw-diff";

const fetchAllMergeRequestDiffs = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestChangeDC[]> => {
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
      `/projects/${project.id}/merge_requests/${mergeRequestIid}/diffs?${params.toString()}`,
      signal,
    );

    const batch = (await response.json()) as GitLabMergeRequestChangeDC[];
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
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<string> => {
  const response = await gitlabFetch(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/raw_diffs`,
    signal,
  );

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.status}`);
  }

  return response.text();
};

const fetchMergeRequestChangesFromChangesEndpoint = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestChangeDC[]> => {
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
    changes?: GitLabMergeRequestChangeDC[];
  };

  return payload.changes ?? [];
};

const mergeMissingDiffs = (
  diffs: GitLabMergeRequestChangeDC[],
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

export const getMergeRequestChanges = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestChangeDC[]> => {
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

  return diffs;
};
