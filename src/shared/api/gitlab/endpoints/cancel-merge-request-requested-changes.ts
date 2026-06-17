import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabGraphql } from "../client";
import type { GitLabProjectDC } from "../data-contracts";

export const cancelMergeRequestRequestedChanges = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<void> => {
  const result = await gitlabGraphql<{
    mergeRequestDestroyRequestedChanges: {
      errors: string[];
    };
  }>(
    connection,
    `
      mutation CancelRequestChanges($projectPath: ID!, $iid: String!) {
        mergeRequestDestroyRequestedChanges(
          input: { projectPath: $projectPath, iid: $iid }
        ) {
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

  const errors = result.mergeRequestDestroyRequestedChanges.errors;
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
};
