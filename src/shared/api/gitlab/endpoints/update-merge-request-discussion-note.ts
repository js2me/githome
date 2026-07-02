import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPut } from "../client";
import type { GitLabNoteDC, GitLabProjectDC } from "../data-contracts";

export const updateMergeRequestDiscussionNote = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  discussionId: string,
  noteId: number,
  body: string,
  signal?: AbortSignal,
): Promise<GitLabNoteDC> => {
  return gitlabPut<GitLabNoteDC>(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions/${encodeURIComponent(discussionId)}/notes/${noteId}`,
    { body },
    signal,
  );
};
