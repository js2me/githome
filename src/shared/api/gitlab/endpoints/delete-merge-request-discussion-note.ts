import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import type { GitLabProjectDC } from "../data-contracts";
import { gitlabDelete } from "../client";

export const deleteMergeRequestDiscussionNote = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  discussionId: string,
  noteId: number,
  signal?: AbortSignal,
): Promise<void> => {
  await gitlabDelete(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions/${encodeURIComponent(discussionId)}/notes/${noteId}`,
    signal,
  );
};
