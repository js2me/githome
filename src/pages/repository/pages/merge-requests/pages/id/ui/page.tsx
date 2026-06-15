import { withViewModel } from "mobx-view-model-react";
import { StatusMessage } from "@/shared/ui/status-message";
import { MergeRequestVM } from "../model";
import { MergeRequestDetail } from "./components/merge-request-detail";

export const MergeRequestPage = withViewModel(MergeRequestVM, ({ model }) => {
  const { mrInfo } = model;

  return (
    <section className="max-w-[1100px]">
      {mrInfo.isLoading && (
        <StatusMessage>Загружаем merge request...</StatusMessage>
      )}

      {mrInfo.errorMessage && !mrInfo.isLoading && (
        <StatusMessage error>{mrInfo.errorMessage}</StatusMessage>
      )}

      {!mrInfo.isLoading &&
        !mrInfo.errorMessage &&
        mrInfo.mergeRequestDetail &&
        mrInfo.mergeRequestChanges &&
        mrInfo.mergeRequestDiscussions && (
          <MergeRequestDetail
            mergeRequest={mrInfo.mergeRequestDetail}
            changes={mrInfo.mergeRequestChanges.changes}
            discussions={mrInfo.mergeRequestDiscussions.discussions}
            canComment={mrInfo.mergeRequestDetail.diffRefs !== null}
            isSubmittingComment={mrInfo.isSubmittingDiffComment}
            submitCommentError={mrInfo.submitDiffCommentError}
            onAddComment={(input) => mrInfo.submitDiffComment(input)}
            onClearSubmitError={() => mrInfo.clearSubmitDiffCommentError()}
            loadFileContent={(filePath, ref) =>
              mrInfo.loadDiffFileContent(filePath, ref)
            }
          />
        )}
    </section>
  );
});
