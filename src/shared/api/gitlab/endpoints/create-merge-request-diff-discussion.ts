import { buildGitLabLineRangePayload } from "@/shared/lib/gitlab/line-code";
import type { CreateDiffCommentInput } from "@/shared/lib/gitlab/diff-comment";
import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabPost } from "../client";
import type { GitLabDiscussionDC, GitLabProjectDC } from "../data-contracts";

export const createMergeRequestDiffDiscussion = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  diffRefs: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  },
  input: CreateDiffCommentInput,
  signal?: AbortSignal,
): Promise<GitLabDiscussionDC> => {
  const lineRange = input.lineRange
    ? await buildGitLabLineRangePayload({
        filePath: input.newPath,
        start: input.lineRange.start,
        end: input.lineRange.end,
      })
    : undefined;

  const isFileComment =
    input.oldLine === null &&
    input.newLine === null &&
    !lineRange;

  const discussion = await gitlabPost<GitLabDiscussionDC>(
    connection,
    `/projects/${project.id}/merge_requests/${mergeRequestIid}/discussions`,
    {
      body: input.body,
      position: {
        position_type: isFileComment ? "file" : "text",
        base_sha: diffRefs.base_sha,
        head_sha: diffRefs.head_sha,
        start_sha: diffRefs.start_sha,
        old_path: input.oldPath,
        new_path: input.newPath,
        ...(input.oldLine !== null ? { old_line: input.oldLine } : {}),
        ...(input.newLine !== null ? { new_line: input.newLine } : {}),
        ...(lineRange ? { line_range: lineRange } : {}),
      },
    },
    signal,
  );

  return discussion;
};
