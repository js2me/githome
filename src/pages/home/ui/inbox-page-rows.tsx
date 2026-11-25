import { ChevronRight, CodePullRequest, Person } from "@gravity-ui/icons";
import { withPropsViewModel } from "mobx-view-model-react";
import { ReviewStatuses } from "@/entities/gitlab-merge-requests/ui/review-statuses";
import { InboxPageRowsVM } from "../model/inbox-page-rows";

export const InboxPageRows = withPropsViewModel(InboxPageRowsVM, ({ model }) => {
  const { rows, onSelect } = model.payload;
  return rows.map((request) => (
    <li key={request.id} className="home-list-item">
      <button
        className="home-request-row group flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3.5 text-left sm:gap-4 sm:px-4"
        type="button"
        onClick={() => onSelect(request)}
      >
        <span className="home-request-icon grid size-9 shrink-0 place-items-center rounded-xl sm:size-10" aria-hidden>
          <CodePullRequest className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline gap-2 text-xs">
            <span className="shrink-0 font-mono font-semibold text-[var(--glass-accent)]">!{request.iid}</span>
            <span className="truncate text-fg-muted" title={request.projectPath}>{request.projectPath}</span>
          </span>
          <span className="mt-1 block text-[15px] leading-snug font-semibold break-words">{request.title}</span>
          <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
            {request.author?.name && (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-fg-muted">
                <Person className="size-3" aria-hidden />
                <span className="truncate">{request.author.name}</span>
              </span>
            )}
            <ReviewStatuses {...model.statusesFor(request)} />
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-fg-muted group-hover:text-[var(--glass-accent)]" aria-hidden />
      </button>
    </li>
  ));
});
