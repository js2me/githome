import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabDiscussionDC, GitLabProjectDC } from "../data-contracts";

export const getMergeRequestDiscussions = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabDiscussionDC[]> => {
  const discussions = new Map<string, GitLabDiscussionDC>();
  let page = 1;

  while (true) {
    signal?.throwIfAborted();
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
    const previousSize = discussions.size;
    for (const discussion of batch) {
      if (!discussion?.id || !Array.isArray(discussion.notes)) {
        throw new Error("GitLab вернул неполные данные обсуждения");
      }
      discussions.set(discussion.id, discussion);
    }
    if (page > 1 && batch.length > 0 && previousSize === discussions.size) {
      throw new Error("GitLab вернул повторную страницу обсуждений");
    }

    const nextPage = response.headers.get("x-next-page");
    if (nextPage) {
      if (Number(nextPage) !== page + 1) {
        throw new Error("GitLab вернул некорректный номер страницы обсуждений");
      }
    } else {
      const totalPages = Number(response.headers.get("x-total-pages"));
      const hasNextLink = /;\s*rel="next"/i.test(response.headers.get("link") ?? "");
      const hasMore = totalPages > 0 ? page < totalPages : nextPage === null && batch.length >= 100;
      if (!hasNextLink && !hasMore) break;
    }
    page++;
  }

  return [...discussions.values()]
    .filter((discussion) => discussion.notes.length > 0)
    .sort((left, right) => {
      const leftTime = new Date(left.notes[0].created_at).getTime();
      const rightTime = new Date(right.notes[0].created_at).getTime();
      return leftTime - rightTime;
    });
};
