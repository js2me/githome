import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabDiscussionDC, GitLabProjectDC } from "../data-contracts";

export const getMergeRequestDiscussions = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabDiscussionDC[]> => {
  const discussions: GitLabDiscussionDC[] = [];
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

    const batch = (await response.json()) as GitLabDiscussionDC[];
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

  return discussions
    .filter((discussion) => discussion.notes.length > 0)
    .sort((left, right) => {
      const leftTime = new Date(left.notes[0].created_at).getTime();
      const rightTime = new Date(right.notes[0].created_at).getTime();
      return leftTime - rightTime;
    });
};
