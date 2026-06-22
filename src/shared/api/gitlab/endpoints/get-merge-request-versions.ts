import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabMergeRequestVersionDC, GitLabProjectDC } from "../data-contracts";

export const getMergeRequestVersions = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestVersionDC[]> => {
  const allVersions: GitLabMergeRequestVersionDC[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: "100",
    });

    const response = await gitlabFetch(
      connection,
      `/projects/${project.id}/merge_requests/${mergeRequestIid}/versions?${params}`,
      signal,
    );

    const pageVersions =
      (await response.json()) as GitLabMergeRequestVersionDC[];
    allVersions.push(...pageVersions);

    const nextPage = response.headers.get("x-next-page");
    if (!nextPage) {
      break;
    }

    page = Number(nextPage);
  }

  return allVersions;
};
