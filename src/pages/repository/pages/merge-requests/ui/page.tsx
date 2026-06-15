import { withViewModel } from "mobx-view-model-react";
import { StatusMessage } from "@/shared/ui/status-message";
import { MergeRequestsVM } from "../model";
import { MergeRequestList } from "./components/merge-request-list";

export const MergeRequestsPage = withViewModel(MergeRequestsVM, ({ model }) => {
  const { mrList } = model;

  return (
    <section>
      <h2 className="mb-4 text-[22px] font-semibold">Merge requests</h2>

      {mrList.isLoading && (
        <StatusMessage>Загружаем merge requests...</StatusMessage>
      )}

      {mrList.errorMessage && !mrList.isLoading && (
        <StatusMessage error>{mrList.errorMessage}</StatusMessage>
      )}

      {!mrList.isLoading &&
        !mrList.errorMessage &&
        mrList.mergeRequests.length === 0 && (
          <StatusMessage>Открытых merge requests не найдено.</StatusMessage>
        )}

      {mrList.mergeRequests.length > 0 && (
        <MergeRequestList
          mergeRequests={mrList.mergeRequests}
          selectedMergeRequestIid={mrList.selectedMergeRequestIid}
          onSelect={(mergeRequest) => mrList.openMergeRequest(mergeRequest)}
        />
      )}
    </section>
  );
});
