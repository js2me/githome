import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { gitlabFetch } from "../client";
import type { GitLabUserDC } from "../data-contracts";

export const getCurrentUserId = async (
  connection: GitLabConnection,
  signal?: AbortSignal,
): Promise<number | null> => {
  const response = await gitlabFetch(connection, "/user", signal);
  const user = (await response.json()) as GitLabUserDC;
  return user.id ?? null;
};
