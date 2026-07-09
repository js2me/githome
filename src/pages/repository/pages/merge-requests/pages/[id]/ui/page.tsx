import { withViewModel } from "mobx-view-model-react";
import { LoadingState } from "@/shared/ui/loading-state";
import { StatusMessage } from "@/shared/ui/status-message";
import { MergeRequestPageVM } from "../model";
import { MergeRequestDetail } from "./components/merge-request-detail";

export const MergeRequestPage = withViewModel(MergeRequestPageVM, ({ model }) => {
  const detailView = model.mrInfo.detailView;
  const connection = model.globals.stores.settings.activeConnection;
  const projectPath = model.project?.path_with_namespace ?? "";
  const markdownScope = {
    connection,
    projectPath,
    projectId: model.project?.id ?? 0,
  };

  return (
    <section>
        {model.mrInfo.isLoading && (
          <LoadingState>
            {model.mrInfo.showPreparingDiffs
              ? "Подготавливаем diff..."
              : "Загружаем Merge Request"}
          </LoadingState>
        )}

        {model.mrInfo.showLoadError && (
          <StatusMessage error>{model.mrInfo.errorMessage}</StatusMessage>
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
              isSubmittingComment={model.mrInfo.isSubmittingDiffComment}
              submitCommentError={model.mrInfo.submitDiffCommentError}
              onAddComment={model.mrInfo.submitDiffComment}
              onClearSubmitError={model.mrInfo.clearSubmitDiffCommentError}
              canCommentOnMr={detailView.mergeRequest.state === "opened"}
              isSubmittingMrComment={model.mrInfo.isSubmittingMrComment}
              submitMrCommentError={model.mrInfo.submitMrCommentError}
              onSubmitMrComment={model.mrInfo.submitMrComment}
              onClearSubmitMrCommentError={model.mrInfo.clearSubmitMrCommentError}
              loadFileContent={model.mrInfo.loadDiffFileContent}
              onResolveDiscussion={model.mrInfo.resolveDiscussion}
              resolvingDiscussionId={model.mrInfo.resolvingDiscussionId}
              resolveDiscussionError={model.mrInfo.resolveDiscussionError}
              currentUserId={model.mrInfo.currentUserId}
              onUpdateDiscussionNote={model.mrInfo.updateDiscussionNote}
              updatingNoteKey={model.mrInfo.updatingNoteKey || null}
              updateNoteError={model.mrInfo.updateNoteError || null}
              onClearUpdateNoteError={model.mrInfo.clearUpdateNoteError}
              reviewActionInProgress={model.mrInfo.reviewActionInProgress}
              reviewActionError={model.mrInfo.reviewActionError}
              onApprove={model.mrInfo.approve}
              onUnapprove={model.mrInfo.unapprove}
              onRequestChanges={model.mrInfo.requestChanges}
              onCancelRequestChanges={model.mrInfo.cancelRequestChanges}
              diffVersions={detailView.diffVersions}
              selectedDiffVersionId={detailView.selectedDiffVersionId}
              onSelectDiffVersion={model.mrInfo.selectDiffVersion}
            />
          )}
      </section>
  );
});
