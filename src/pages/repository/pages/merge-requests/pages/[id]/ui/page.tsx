import { withViewModel } from "mobx-view-model-react";
import { StatusMessage } from "@/shared/ui/status-message";
import { MergeRequestPageVM } from "../model";
import { MergeRequestDetail } from "./components/merge-request-detail";

export const MergeRequestPage = withViewModel(MergeRequestPageVM, ({ model }) => {
  const { mrInfo } = model;
  const detailView = mrInfo.detailView;
  const connection = model.globals.stores.settings.activeConnection;
  const projectPath = model.project?.path_with_namespace ?? "";
  const markdownScope = {
    connection,
    projectPath,
    projectId: model.project?.id ?? 0,
  };

  return (
    <section>
        {mrInfo.isLoading && (
          <StatusMessage>Загружаем merge request...</StatusMessage>
        )}

        {mrInfo.showLoadError && (
          <StatusMessage error>{mrInfo.errorMessage}</StatusMessage>
        )}

        {detailView && (
            <MergeRequestDetail
              markdownScope={markdownScope}
              mergeRequest={detailView.mergeRequest}
              changes={detailView.changes}
              changesError={detailView.changesError}
              discussions={detailView.discussions}
              approvals={detailView.approvals}
              canComment={detailView.mergeRequest.diff_refs != null}
              isSubmittingComment={mrInfo.isSubmittingDiffComment}
              submitCommentError={mrInfo.submitDiffCommentError}
              onAddComment={mrInfo.submitDiffComment}
              onClearSubmitError={mrInfo.clearSubmitDiffCommentError}
              canCommentOnMr={detailView.mergeRequest.state === "opened"}
              isSubmittingMrComment={mrInfo.isSubmittingMrComment}
              submitMrCommentError={mrInfo.submitMrCommentError}
              onSubmitMrComment={mrInfo.submitMrComment}
              onClearSubmitMrCommentError={mrInfo.clearSubmitMrCommentError}
              loadFileContent={mrInfo.loadDiffFileContent}
              onResolveDiscussion={mrInfo.resolveDiscussion}
              resolvingDiscussionId={mrInfo.resolvingDiscussionId}
              resolveDiscussionError={mrInfo.resolveDiscussionError}
              currentUserId={mrInfo.currentUserId}
              onUpdateDiscussionNote={mrInfo.updateDiscussionNote}
              updatingNoteKey={mrInfo.updatingNoteKey || null}
              updateNoteError={mrInfo.updateNoteError || null}
              onClearUpdateNoteError={mrInfo.clearUpdateNoteError}
              reviewActionInProgress={mrInfo.reviewActionInProgress}
              reviewActionError={mrInfo.reviewActionError}
              onApprove={mrInfo.approve}
              onUnapprove={mrInfo.unapprove}
              onRequestChanges={mrInfo.requestChanges}
              onCancelRequestChanges={mrInfo.cancelRequestChanges}
              diffVersions={detailView.diffVersions}
              selectedDiffVersionId={detailView.selectedDiffVersionId}
              onSelectDiffVersion={mrInfo.selectDiffVersion}
            />
          )}
      </section>
  );
});
