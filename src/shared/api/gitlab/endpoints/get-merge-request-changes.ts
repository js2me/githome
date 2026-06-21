import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { getVisibleMergeRequestChanges } from "@/shared/lib/gitlab/merge-request-changes-visibility";
import { fetchGitlabJson, gitlabFetch } from "../client";
import type { GitLabMergeRequestChangeDC, GitLabProjectDC } from "../data-contracts";
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

const fetchMergeRequestChangesViaCompare = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  startSha: string,
  headSha: string,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestChangeDC[]> => {
  const payload = await fetchGitlabJson<GitLabCompareResponseDC>(
    connection,
    `/projects/${project.id}/repository/compare`,
    {
      query: {
        from: startSha,
        to: headSha,
        unidiff: true,
      },
      signal,
    },
  );

  if (payload.compare_timeout) {
    throw new Error("GitLab compare timeout");
  }

  return (payload.diffs ?? []).map(mapCompareDiffToChange);
};

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
      `/projects/${project.id}/merge_requests/${mergeRequestIid}/diffs?${params}`,
      signal,
    );

    const pageDiffs = (await response.json()) as GitLabMergeRequestChangeDC[];
    allDiffs.push(...pageDiffs);

    const nextPage = response.headers.get("x-next-page");
    if (!nextPage) {
      break;
    }

    page = Number(nextPage);
  }

  return getVisibleMergeRequestChanges(allDiffs);
};

export const getMergeRequestChanges = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestChangeDC[]> => {
  const mergeRequest = await getMergeRequestDetail(
    connection,
    project,
    mergeRequestIid,
    signal,
  );
  const { start_sha: startSha, head_sha: headSha } =
    mergeRequest.diff_refs ?? {};

  if (startSha && headSha) {
    try {
      return await fetchMergeRequestChangesViaCompare(
        connection,
        project,
        startSha,
        headSha,
        signal,
      );
    } catch {
      // compare can time out on very large diffs
    }
  }

  return fetchAllMergeRequestDiffs(
    connection,
    project,
    mergeRequestIid,
    signal,
  );
};
