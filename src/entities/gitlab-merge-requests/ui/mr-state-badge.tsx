import type { GitLabMergeRequestDC } from "@/shared/api/gitlab";
import { cva, type VariantProps } from "yummies/css";

export const mrStateBadgeVariants = cva(
  "shrink-0 rounded-full font-bold uppercase",
  {
    variants: {
      state: {
        draft: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
        opened: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
        merged: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        closed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
      },
      size: {
        sm: "px-2 py-1 text-[11px]",
        md: "px-2.5 py-1 text-[11px]",
      },
    },
    defaultVariants: {
      state: "draft",
      size: "sm",
    },
  },
);

export type MrStateBadgeState = NonNullable<
  VariantProps<typeof mrStateBadgeVariants>["state"]
>;

export const getMrStateBadgeState = (state: string): MrStateBadgeState => {
  if (
    state === "draft" ||
    state === "opened" ||
    state === "merged" ||
    state === "closed"
  ) {
    return state;
  }

  return "draft";
};

const isDraft = (mergeRequest: GitLabMergeRequestDC) =>
  mergeRequest.draft ?? mergeRequest.work_in_progress ?? false;

const getStateLabel = (mergeRequest: GitLabMergeRequestDC) => {
  if (isDraft(mergeRequest)) {
    return "Draft";
  }

  if (mergeRequest.state === "opened") {
    return "Open";
  }

  if (mergeRequest.state === "merged") {
    return "Merged";
  }

  if (mergeRequest.state === "closed") {
    return "Closed";
  }

  return mergeRequest.state;
};

export const MrStateBadge = ({
  mergeRequest,
  size = "sm",
}: {
  mergeRequest: GitLabMergeRequestDC;
  size?: NonNullable<VariantProps<typeof mrStateBadgeVariants>["size"]>;
}) => {
  const stateKey = isDraft(mergeRequest) ? "draft" : mergeRequest.state;

  return (
    <span
      className={mrStateBadgeVariants({
        state: getMrStateBadgeState(stateKey),
        size,
      })}
    >
      {getStateLabel(mergeRequest)}
    </span>
  );
};
