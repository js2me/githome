import type { GitLabMergeRequest } from "@/shared/api/gitlab";
import { cx } from "yummies/css";
import {
  getMrStateBadgeState,
  mrStateBadgeVariants,
} from "@/shared/ui/mr-state-badge";

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStateLabel = (mergeRequest: GitLabMergeRequest) => {
  if (mergeRequest.draft) {
    return "Draft";
  }

  if (mergeRequest.state === "opened") {
    return "Open";
  }

  return mergeRequest.state;
};

export const MergeRequestList = ({
  mergeRequests,
  selectedMergeRequestIid,
  onSelect,
}: {
  mergeRequests: GitLabMergeRequest[];
  selectedMergeRequestIid: number | null;
  onSelect: (mergeRequest: GitLabMergeRequest) => void;
}) => {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {mergeRequests.map((mergeRequest) => {
        const isSelected = selectedMergeRequestIid === mergeRequest.iid;
        const stateKey = mergeRequest.draft ? "draft" : mergeRequest.state;

        return (
          <li key={mergeRequest.id}>
            <button
              className={cx(
                "flex w-full cursor-pointer flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left text-inherit transition hover:border-[#fc6d26] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-gray-900",
                isSelected && "border-[#fc6d26] shadow-[0_0_0_3px_rgba(252,109,38,0.12)]",
              )}
              type="button"
              onClick={() => onSelect(mergeRequest)}
            >
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 text-[13px] font-bold text-slate-500">
                  !{mergeRequest.iid}
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-semibold text-slate-900 dark:text-slate-200">
                  {mergeRequest.title}
                </span>
                <span
                  className={mrStateBadgeVariants({
                    state: getMrStateBadgeState(stateKey),
                    size: "sm",
                  })}
                >
                  {getStateLabel(mergeRequest)}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                <span className="font-mono">
                  {mergeRequest.sourceBranch} → {mergeRequest.targetBranch}
                </span>
                <span>{formatUpdatedAt(mergeRequest.updatedAt)}</span>
              </div>

              <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400">
                {mergeRequest.authorAvatarUrl ? (
                  <img
                    className="h-6 w-6 rounded-full object-cover"
                    src={mergeRequest.authorAvatarUrl}
                    alt=""
                  />
                ) : (
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {mergeRequest.authorName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span>{mergeRequest.authorName}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
