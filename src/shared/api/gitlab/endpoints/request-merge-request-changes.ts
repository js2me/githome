import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabGraphql } from "../client";
import type { GitLabProjectDC } from "../data-contracts";
import { ensureCurrentUserReviewer } from "./ensure-current-user-reviewer";

export const requestMergeRequestChanges = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<void> => {
  await ensureCurrentUserReviewer(
    connection,
    project.path_with_namespace,
    mergeRequestIid,
    signal,
  );

  const result = await gitlabGraphql<{
    mergeRequestRequestChanges: {
      errors: string[];
    };
  }>(
    connection,
    `
      mutation RequestChanges($projectPath: ID!, $iid: String!) {
        mergeRequestRequestChanges(input: { projectPath: $projectPath, iid: $iid }) {
          errors
        }
      }
    `,
    {
      projectPath: project.path_with_namespace,
      iid: String(mergeRequestIid),
    },
    signal,
  );

  const errors = result.mergeRequestRequestChanges.errors;
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
};
