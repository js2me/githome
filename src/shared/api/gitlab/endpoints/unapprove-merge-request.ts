import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPost } from "../client";
import type { GitLabProjectDC } from "../data-contracts";

export const unapproveMergeRequest = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
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
