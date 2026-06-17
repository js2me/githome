import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabGraphql } from "../client";

export const ensureCurrentUserReviewer = async (
  connection: GitLabConnection,
  projectPath: string,
  mergeRequestIid: number,
  signal?: AbortSignal,
): Promise<void> => {
  const data = await gitlabGraphql<{
    currentUser: { username: string } | null;
    project: {
      mergeRequest: {
        reviewers: { nodes: Array<{ username: string }> };
      } | null;
    } | null;
  }>(
    connection,
    `
      query EnsureReviewer($projectPath: ID!, $iid: String!) {
        currentUser {
          username
        }
        project(fullPath: $projectPath) {
          mergeRequest(iid: $iid) {
            reviewers {
              nodes {
                username
              }
            }
          }
        }
      }
    `,
    { projectPath, iid: String(mergeRequestIid) },
    signal,
  );

  const username = data.currentUser?.username;
  const reviewers = data.project?.mergeRequest?.reviewers.nodes ?? [];

  if (!username) {
    return;
  }

  if (reviewers.some((reviewer) => reviewer.username === username)) {
    return;
  }

  const mutationResult = await gitlabGraphql<{
    mergeRequestSetReviewers: {
      errors: string[];
    };
  }>(
    connection,
    `
      mutation AddReviewer($projectPath: ID!, $iid: String!, $username: String!) {
        mergeRequestSetReviewers(
          input: {
            projectPath: $projectPath
            iid: $iid
            reviewerUsernames: [$username]
            operationMode: APPEND
          }
        ) {
          errors
        }
      }
    `,
    { projectPath, iid: String(mergeRequestIid), username },
    signal,
  );

  const errors = mutationResult.mergeRequestSetReviewers.errors;
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
};
