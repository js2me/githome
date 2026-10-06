import { withViewModel } from "mobx-view-model-react";
import { LoadMoreSentinel } from "@/shared/ui/load-more-sentinel";
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

      {mrList.showList && mrList.canLoadMore && (
        <LoadMoreSentinel
          disabled={mrList.isFetching || !mrList.canLoadMore}
          onLoadMore={mrList.loadMore}
        />
      )}

      {mrList.isFetchingNextPage && (
        <StatusMessage className="mt-2">
          Загружаем ещё merge requests...
        </StatusMessage>
      )}
    </section>
  );
});
