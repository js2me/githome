import { withViewModel } from "mobx-view-model-react";
import { StatusMessage } from "@/shared/ui/status-message";
import { MergeRequestsPageVM } from "../model";
import { MergeRequestList } from "./components/merge-request-list";

export const MergeRequestsPage = withViewModel(MergeRequestsPageVM, ({ model }) => {
  const { mrList } = model;

  return (
    <section>
      <h2 className="mb-4 text-[22px] font-semibold">Merge requests</h2>

      {mrList.isLoading && (
        <StatusMessage>Загружаем merge requests...</StatusMessage>
      )}

      {mrList.showLoadError && (
        <StatusMessage error>{mrList.errorMessage}</StatusMessage>
      )}

      {mrList.showEmptyListMessage && (
        <StatusMessage>Открытых merge requests не найдено.</StatusMessage>
      )}

      {mrList.showList && (
        <MergeRequestList
          mergeRequests={mrList.mergeRequests}
          approvalCounts={mrList.approvalCounts}
          selectedMergeRequestIid={mrList.selectedMergeRequestIid}
          onSelect={mrList.openMergeRequest}
        />
      )}

      {mrList.canLoadMore && (
        <button
          className="mt-4 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:border-brand disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-gray-900 dark:text-slate-200"
          type="button"
          disabled={mrList.isFetching}
          onClick={mrList.loadMore}
        >
          {mrList.isFetchingNextPage ? "Загружаем..." : mrList.canLoadMoreLabel}
        </button>
      )}
    </section>
  );
});
