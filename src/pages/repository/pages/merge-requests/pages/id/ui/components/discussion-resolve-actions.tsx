import { memo } from "react";
import { cn } from "@/shared/lib/cn";

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    className="h-3.5 w-3.5"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
);

export const DiscussionResolveActions = memo(
  ({
    discussionId,
    resolved,
    resolvable,
    isResolving,
    onResolve,
    className,
  }: {
    discussionId: string;
    resolved: boolean;
    resolvable: boolean;
    isResolving: boolean;
    onResolve: (discussionId: string, resolved: boolean) => void;
    className?: string;
  }) => {
    if (!resolvable) {
      return null;
    }

    return (
      <div className={cn("flex items-center justify-end gap-2", className)}>
        <button
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50 dark:border-slate-600 dark:bg-[#0d1117] dark:text-slate-300 dark:hover:bg-slate-800"
          type="button"
          disabled={isResolving}
          onClick={() => onResolve(discussionId, !resolved)}
        >
          <CheckIcon />
          {resolved ? "Открыть тред" : "Разрешить тред"}
        </button>
      </div>
    );
  },
);
