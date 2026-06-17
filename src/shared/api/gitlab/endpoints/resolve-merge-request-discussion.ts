import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPut } from "../client";
import type { GitLabDiscussionDC, GitLabProjectDC } from "../data-contracts";

export const resolveMergeRequestDiscussion = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  discussionId: string,
  resolved: boolean,
  signal?: AbortSignal,
): Promise<GitLabDiscussionDC> => {
  return gitlabPut<GitLabDiscussionDC>(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions/${encodeURIComponent(discussionId)}`,
    { resolved },
    signal,
  );
};
