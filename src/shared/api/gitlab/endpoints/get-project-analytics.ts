import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { buildGitlabPath, gitlabFetch } from "../client";
import type {
  GitLabCommitDC,
  GitLabMergeRequestDC,
  GitLabProjectAnalyticsDC,
} from "../data-contracts";

const PER_PAGE = 100;
const MAX_PAGES = 100;

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
        with_stats: true,
      },
      signal,
    ),
  ]);

  return { commits, mergedMergeRequests };
};
