import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPost } from "../client";
import type { GitLabProjectDC } from "../data-contracts";

export const approveMergeRequest = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
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
