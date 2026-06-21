import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPost } from "../client";
import type { GitLabDiscussionDC, GitLabProjectDC } from "../data-contracts";

export const createMergeRequestDiscussion = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  body: string,
  signal?: AbortSignal,
): Promise<GitLabDiscussionDC> => {
  return gitlabPost<GitLabDiscussionDC>(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions`,
    { body },
    signal,
  );
};
