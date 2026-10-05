import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { buildGitlabPath, gitlabFetch } from "../client";
import type {
  GitLabCommitDC,
  GitLabMergeRequestDC,
  GitLabProjectAnalyticsDC,
} from "../data-contracts";

const PER_PAGE = 100;
const MAX_PAGES = 100;
const MERGE_REQUEST_STATS_CONCURRENCY = 6;

const getAllPages = async <TItem>(
  connection: GitLabConnection,
  path: string,
  query: Record<string, string | number | boolean | null | undefined>,
  signal: AbortSignal,
): Promise<TItem[]> => {
  const items: TItem[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await gitlabFetch(
      connection,
      buildGitlabPath(path, { ...query, page }),
      signal,
    );
    const pageItems = (await response.json()) as TItem[];
    items.push(...pageItems);

    const nextPage = response.headers.get("X-Next-Page");
    if (nextPage) {
      continue;
    }

    if (pageItems.length < PER_PAGE) {
      break;
    }
  }

  return items;
};

const getMergeRequestChangedFileCount = async (
  connection: GitLabConnection,
  projectId: number,
  mergeRequest: GitLabMergeRequestDC,
  signal: AbortSignal,
) => {
  const mergeRequestPath = `/projects/${projectId}/merge_requests/${mergeRequest.iid}`;
  const detailResponse = await gitlabFetch(
    connection,
    buildGitlabPath(mergeRequestPath, { with_stats: true }),
    signal,
  );
  const detail = (await detailResponse.json()) as GitLabMergeRequestDC;

  if (detail.changes_count != null) {
    return detail.changes_count;
  }

  const diffsResponse = await gitlabFetch(
    connection,
    buildGitlabPath(`${mergeRequestPath}/diffs`, { per_page: 1 }),
    signal,
  );
  const total = diffsResponse.headers.get("X-Total");

  if (total !== null) {
    return total;
  }

  const firstDiffPage = (await diffsResponse.json()) as unknown[];
  return String(firstDiffPage.length);
};

const enrichMergeRequestsWithChangeCounts = async (
  connection: GitLabConnection,
  projectId: number,
  mergeRequests: GitLabMergeRequestDC[],
  signal: AbortSignal,
) => {
  const enriched: GitLabMergeRequestDC[] = [];

  for (
    let offset = 0;
    offset < mergeRequests.length;
    offset += MERGE_REQUEST_STATS_CONCURRENCY
  ) {
    const batch = mergeRequests.slice(
      offset,
      offset + MERGE_REQUEST_STATS_CONCURRENCY,
    );
    enriched.push(
      ...(await Promise.all(
        batch.map(async (mergeRequest) => ({
          ...mergeRequest,
          changes_count: await getMergeRequestChangedFileCount(
            connection,
            projectId,
            mergeRequest,
            signal,
          ),
        })),
      )),
    );
  }

  return enriched;
};

export const getProjectAnalytics = async (
  connection: GitLabConnection,
  projectId: number,
  defaultBranch: string | null,
  since: string,
  until: string,
  signal: AbortSignal,
): Promise<GitLabProjectAnalyticsDC> => {
  const [commits, mergedMergeRequests] = await Promise.all([
    getAllPages<GitLabCommitDC>(
      connection,
      `/projects/${projectId}/repository/commits`,
      {
        ref_name: defaultBranch,
        since,
        until,
        per_page: PER_PAGE,
      },
      signal,
    ),
    getAllPages<GitLabMergeRequestDC>(
      connection,
      `/projects/${projectId}/merge_requests`,
      {
        state: "merged",
        merged_after: since,
        merged_before: until,
        order_by: "merged_at",
        sort: "asc",
        per_page: PER_PAGE,
      },
      signal,
    ),
  ]);

  return {
    commits,
    mergedMergeRequests: await enrichMergeRequestsWithChangeCounts(
      connection,
      projectId,
      mergedMergeRequests,
      signal,
    ),
  };
};
