import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import type { GitLabProjectDC } from "../data-contracts";
import { getMergeRequestApprovals } from "./get-merge-request-approvals";

export const getMergeRequestApprovalCounts = async (
  connection: GitLabConnection,
  project: GitLabProjectDC,
  mergeRequestIids: number[],
  signal?: AbortSignal,
): Promise<Record<number, number>> => {
  const entries = await Promise.all(
    mergeRequestIids.map(async (iid) => {
      try {
        const approvals = await getMergeRequestApprovals(
          connection,
          project,
          iid,
          signal,
        );
        return [iid, approvals.approved_by?.length ?? 0] as const;
      } catch {
        return null;
      }
    }),
  );

  return Object.fromEntries(
    entries.filter((entry): entry is readonly [number, number] => entry !== null),
  );
};
