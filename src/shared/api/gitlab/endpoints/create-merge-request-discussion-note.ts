import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPost } from "../client";
import type { GitLabNoteDC, GitLabProjectDC } from "../data-contracts";

export const createMergeRequestDiscussionNote = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  discussionId: string,
  body: string,
  signal?: AbortSignal,
): Promise<GitLabNoteDC> => {
  return gitlabPost<GitLabNoteDC>(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions/${encodeURIComponent(discussionId)}/notes`,
    { body },
    signal,
  );
};
